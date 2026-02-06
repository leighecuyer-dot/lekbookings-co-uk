export {
  useContactPreferences,
  useUpdateContactPreferences,
  useSendTransactionalMessage,
  useSendMarketingCampaign,
  useMessageLogs,
  useMessagingStats,
} from "./useMessaging";

export type {
  MessageChannel,
  MessageType,
  ContactPreferences,
  MessageLog,
  SendTransactionalParams,
  SendMarketingParams,
  SendResult,
  CampaignResult,
} from "./useMessaging";
