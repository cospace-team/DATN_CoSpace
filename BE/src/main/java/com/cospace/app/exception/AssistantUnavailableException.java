package com.cospace.app.exception;

/**
 * The AI assistant could not answer. Its message is written for the customer and is safe to show
 * in the chat widget; anything else that goes wrong during a turn is replaced by a generic message.
 */
public class AssistantUnavailableException extends RuntimeException {

    public AssistantUnavailableException(String message) {
        super(message);
    }

    public AssistantUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
