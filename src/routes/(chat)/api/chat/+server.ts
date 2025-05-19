import { myProvider } from '$lib/server/ai/models';
import { systemPrompt } from '$lib/server/ai/prompts.js';
import { generateTitleFromUserMessage } from '$lib/server/ai/utils';
import { deleteChatById, getChatById, saveChat, saveMessages } from '$lib/server/db/queries.js';
import type { Chat } from '$lib/server/db/schema';
import { getMostRecentUserMessage, getTrailingMessageId } from '$lib/utils/chat.js';
import { allowAnonymousChats } from '$lib/utils/constants.js';
import { error } from '@sveltejs/kit';
import {
	appendResponseMessages,
	createDataStreamResponse,
	smoothStream,
	streamText,
	type UIMessage
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { ok, safeTry } from 'neverthrow';
import { CUSTOM_API_KEY, CUSTOM_API_URL } from '$env/static/private';

export async function POST({ request, locals: { user }, cookies }) {
	// TODO: zod?
	const { id, messages }: { id: string; messages: UIMessage[] } = await request.json();
	const selectedChatModel = cookies.get('selected-model');
	const selectedCollections = cookies.get('selected-collections') || '';
	const collectionsArray = selectedCollections ? selectedCollections.split(',').filter(Boolean) : [];

	// Add debugging for model and collections
	console.log(`DEBUG: selectedChatModel = "${selectedChatModel}"`);
	console.log(`DEBUG: selectedCollections = "${selectedCollections}"`);
	console.log(`DEBUG: collectionsArray = ${JSON.stringify(collectionsArray)}`);

	if (!user && !allowAnonymousChats) {
		error(401, 'Unauthorized');
	}

	if (!selectedChatModel) {
		error(400, 'No chat model selected');
	}

	const userMessage = getMostRecentUserMessage(messages);

	if (!userMessage) {
		error(400, 'No user message found');
	}

	if (user) {
		await safeTry(async function* () {
			let chat: Chat;
			const chatResult = await getChatById({ id });
			if (chatResult.isErr()) {
				if (chatResult.error._tag !== 'DbEntityNotFoundError') {
					return chatResult;
				}
				const title = yield* generateTitleFromUserMessage({ message: userMessage });
				chat = yield* saveChat({ id, userId: user.id, title });
			} else {
				chat = chatResult.value;
			}

			if (chat.userId !== user.id) {
				error(403, 'Forbidden');
			}

			yield* saveMessages({
				messages: [
					{
						chatId: id,
						id: userMessage.id,
						role: 'user',
						parts: userMessage.parts,
						attachments: userMessage.experimental_attachments ?? [],
						createdAt: new Date()
					}
				]
			});

			return ok(undefined);
		}).orElse(() => error(500, 'An error occurred while processing your request'));
	}

	// For native model with collections, create a direct custom provider with proper URL
	if (selectedChatModel === 'native-model' && collectionsArray.length > 0) {
		// We need to create a custom provider that uses a custom fetch
		const collectionsParam = collectionsArray.join(',');

		// Make sure not to append a path, just add query parameter to base URL
		// CUSTOM_API_URL is likely ending with /v1/
		const baseUrl = CUSTOM_API_URL.endsWith('/') ? CUSTOM_API_URL.slice(0, -1) : CUSTOM_API_URL;
		console.log(`DEBUG: Base URL: ${baseUrl}`);

		// Create custom fetch function that adds collections parameter to chat/completions endpoint
		const customFetch = (url, options) => {
			// Only modify the URL if it ends with /chat/completions
			if (url.endsWith('/chat/completions')) {
				const modifiedUrl = `${url}?collections=${collectionsParam}`;
				console.log(`DEBUG: Original URL: ${url}`);
				console.log(`DEBUG: Modified URL: ${modifiedUrl}`);
				return fetch(modifiedUrl, options);
			}
			return fetch(url, options);
		};

		// Create a custom provider that uses our custom fetch
		const customProvider = createOpenAI({
			apiKey: CUSTOM_API_KEY,
			baseURL: baseUrl,
			fetch: customFetch
		});

		return createDataStreamResponse({
			execute: (dataStream) => {
				const result = streamText({
					model: customProvider('native'),
					system: systemPrompt({ selectedChatModel }),
					messages,
					maxSteps: 5,
					experimental_activeTools: [],
					experimental_transform: smoothStream({ chunking: 'word' }),
					experimental_generateMessageId: crypto.randomUUID.bind(crypto),
					onFinish: async ({ response }) => {
						if (!user) return;
						const assistantId = getTrailingMessageId({
							messages: response.messages.filter((message) => message.role === 'assistant')
						});

						if (!assistantId) {
							throw new Error('No assistant message found!');
						}

						const [, assistantMessage] = appendResponseMessages({
							messages: [userMessage],
							responseMessages: response.messages
						});

						await saveMessages({
							messages: [
								{
									id: assistantId,
									chatId: id,
									role: assistantMessage.role,
									parts: assistantMessage.parts,
									attachments: assistantMessage.experimental_attachments ?? [],
									createdAt: new Date()
								}
							]
						});
					},
					experimental_telemetry: {
						isEnabled: true,
						functionId: 'stream-text'
					}
				});

				result.consumeStream();

				result.mergeIntoDataStream(dataStream, {
					sendReasoning: true
				});
			},
			onError: (e) => {
				console.error('Stream error:', e);
				return 'Oops!';
			}
		});
	}

	// Standard approach for other models
	return createDataStreamResponse({
		execute: (dataStream) => {
			const result = streamText({
				model: myProvider.languageModel(selectedChatModel),
				system: systemPrompt({ selectedChatModel }),
				messages,
				maxSteps: 5,
				experimental_activeTools: [],
				experimental_transform: smoothStream({ chunking: 'word' }),
				experimental_generateMessageId: crypto.randomUUID.bind(crypto),
				onFinish: async ({ response }) => {
					if (!user) return;
					const assistantId = getTrailingMessageId({
						messages: response.messages.filter((message) => message.role === 'assistant')
					});

					if (!assistantId) {
						throw new Error('No assistant message found!');
					}

					const [, assistantMessage] = appendResponseMessages({
						messages: [userMessage],
						responseMessages: response.messages
					});

					await saveMessages({
						messages: [
							{
								id: assistantId,
								chatId: id,
								role: assistantMessage.role,
								parts: assistantMessage.parts,
								attachments: assistantMessage.experimental_attachments ?? [],
								createdAt: new Date()
							}
						]
					});
				},
				experimental_telemetry: {
					isEnabled: true,
					functionId: 'stream-text'
				}
			});

			result.consumeStream();

			result.mergeIntoDataStream(dataStream, {
				sendReasoning: true
			});
		},
		onError: (e) => {
			console.error('Stream error:', e);
			return 'Oops!';
		}
	});
}

export async function DELETE({ locals: { user }, request }) {
	// TODO: zod
	const { id }: { id: string } = await request.json();
	if (!user) {
		error(401, 'Unauthorized');
	}

	return await getChatById({ id })
		.andTee((chat) => {
			if (chat.userId !== user.id) {
				error(403, 'Forbidden');
			}
		})
		.andThen(deleteChatById)
		.match(
			() => new Response('Chat deleted', { status: 200 }),
			() => error(500, 'An error occurred while processing your request')
		);
}