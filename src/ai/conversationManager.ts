import { Conversation, Message } from './types';

export class ConversationManager {
  private activeConversation: Conversation;

  constructor() {
    this.activeConversation = this.createConversation();
  }

  public createConversation(title = 'New Centipede Session'): Conversation {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id,
      title,
      messages: [],
      activeContext: {},
      createdTime: Date.now(),
      updatedTime: Date.now(),
    };
  }

  public getActiveConversation(): Conversation {
    return this.activeConversation;
  }

  public addMessage(msg: Message): void {
    this.activeConversation.messages.push(msg);
    this.activeConversation.updatedTime = Date.now();
  }

  public clear(): void {
    this.activeConversation = this.createConversation();
  }
}

export const conversationManager = new ConversationManager();
