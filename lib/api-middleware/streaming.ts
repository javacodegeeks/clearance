
import { NextResponse } from 'next/server';

export type StreamContentType = 'text/plain' | 'application/x-ndjson';

export interface StreamingOptions<T> {
  contentType?: StreamContentType;

  serializer?: (chunk: T) => string;

  onError?: (error: unknown) => void;

  additionalHeaders?: Record<string, string>;
}

export function createStreamingResponse<T>(
  generator: AsyncGenerator<T>,
  options: StreamingOptions<T> = {}
): NextResponse {
  const {
    contentType = 'text/plain',
    serializer = getDefaultSerializer<T>(contentType),
    onError,
    additionalHeaders = {}
  } = options;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          const data = serializer(chunk);
          controller.enqueue(encoder.encode(data));
        }
        controller.close();
      } catch (error) {
        console.error('[Streaming] Error:', error);
        if (onError) {
          onError(error);
        }
        controller.error(error);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...additionalHeaders
    },
  });
}

export function createNDJSONStreamingResponse<T extends Record<string, any>>(
  generator: AsyncGenerator<T>,
  options: Omit<StreamingOptions<T>, 'contentType' | 'serializer'> = {}
): NextResponse {
  return createStreamingResponse(generator, {
    ...options,
    contentType: 'application/x-ndjson',
    serializer: (chunk) => JSON.stringify(chunk) + '\n'
  });
}

export function createTextStreamingResponse(
  generator: AsyncGenerator<string>,
  options: Omit<StreamingOptions<string>, 'contentType' | 'serializer'> = {}
): NextResponse {
  return createStreamingResponse(generator, {
    ...options,
    contentType: 'text/plain',
    serializer: (chunk) => chunk
  });
}

function getDefaultSerializer<T>(contentType: StreamContentType): (chunk: T) => string {
  if (contentType === 'application/x-ndjson') {
    return (chunk) => JSON.stringify(chunk) + '\n';
  }
  return (chunk) => String(chunk);
}
