/**
 * Server-Sent Events (SSE) Client for DealMind Live Agent Trace Streaming
 */
export function connectAgentStream(sessionId, { onEvent, onConnected, onError, onComplete }) {
  if (!sessionId) {
    console.warn('connectAgentStream: No sessionId provided');
    return { close: () => {} };
  }

  const url = `/api/negotiations/stream/${encodeURIComponent(sessionId)}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('connected', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onConnected) onConnected(data);
    } catch (err) {
      console.error('SSE connected parse error:', err);
    }
  });

  eventSource.addEventListener('memory:retrieved', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onEvent) onEvent({ type: 'memory:retrieved', ...data });
    } catch (err) {
      console.error('SSE memory:retrieved parse error:', err);
    }
  });

  eventSource.addEventListener('reflection:ready', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onEvent) onEvent({ type: 'reflection:ready', ...data });
    } catch (err) {
      console.error('SSE reflection:ready parse error:', err);
    }
  });

  eventSource.addEventListener('tool:completed', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onEvent) onEvent({ type: 'tool:completed', ...data });
    } catch (err) {
      console.error('SSE tool:completed parse error:', err);
    }
  });

  eventSource.addEventListener('agent:completed', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (onComplete) onComplete(data);
    } catch (err) {
      console.error('SSE agent:completed parse error:', err);
    }
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return {
    close: () => {
      eventSource.close();
    }
  };
}
