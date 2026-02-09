import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@watchagent/api-client';

export function useChat() {
  const queryClient = useQueryClient();

  const conversationQuery = useQuery({
    queryKey: ['chat', 'conversation'],
    queryFn: () => chatApi.getConversation(),
    retry: false,
  });

  const initOnboardingMutation = useMutation({
    mutationFn: () => chatApi.initOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversation'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, message }: { conversationId: string; message: string }) =>
      chatApi.sendMessage(conversationId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversation'] });
    },
  });

  return {
    conversation: conversationQuery.data,
    isLoading: conversationQuery.isLoading,
    initOnboarding: initOnboardingMutation.mutate,
    initOnboardingAsync: initOnboardingMutation.mutateAsync,
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
