import axios, { AxiosInstance } from "axios";

interface ThreadsConfig {
  userId: string;
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
}

interface MediaContainerResponse {
  id: string;
  [key: string]: unknown;
}

interface PublishResponse {
  id: string;
  [key: string]: unknown;
}

class ThreadsPublisher {
  private readonly client: AxiosInstance;
  private readonly config: Required<ThreadsConfig>;
  private static readonly DEFAULT_TIMEOUT = 5000;
  private static readonly DEFAULT_BASE_URL = "https://graph.threads.net/v1.0";

  constructor(config: ThreadsConfig) {
    this._validateConfig(config);
    this.config = this._initializeConfig(config);
    this.client = this._initializeClient();
  }

  async publishPost(content: string): Promise<string> {
    try {
      if (!content.trim()) {
        throw new Error("Content cannot be empty");
      }

      const containerId = await this._createMediaContainer(content);
      const postId = await this._publishMediaContainer(containerId);

      return postId;
    } catch (error) {
      throw new Error(
        `Failed to publish post: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  static createFromEnv(): ThreadsPublisher {
    const userId = process.env.THREADS_USER_ID;
    const accessToken = process.env.THREADS_ACCESS_TOKEN;

    if (!userId || !accessToken) {
      throw new Error(
        "Missing required environment variables: THREADS_USER_ID and/or THREADS_ACCESS_TOKEN"
      );
    }

    return new ThreadsPublisher({ userId, accessToken });
  }

  private _validateConfig(config: ThreadsConfig): void {
    const requiredFields = ["userId", "accessToken"] as const;
    const missingFields = requiredFields.filter((field) => !config[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required configuration fields: ${missingFields.join(", ")}`
      );
    }
  }

  private _initializeConfig(config: ThreadsConfig): Required<ThreadsConfig> {
    return {
      userId: config.userId,
      accessToken: config.accessToken,
      baseUrl: config.baseUrl || ThreadsPublisher.DEFAULT_BASE_URL,
      timeout: config.timeout || ThreadsPublisher.DEFAULT_TIMEOUT,
    };
  }

  private _initializeClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  private async _createMediaContainer(content: string): Promise<string> {
    try {
      const response = await this.client.post<MediaContainerResponse>(
        `/${this.config.userId}/threads`,
        {
          media_type: "TEXT",
          text: content,
          access_token: this.config.accessToken,
        }
      );

      if (!response.data.id) {
        throw new Error("Media container creation failed: No ID returned");
      }

      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to create media container: ${
            error.response?.status || error.message
          }`
        );
      }
      throw error;
    }
  }

  private async _publishMediaContainer(containerId: string): Promise<string> {
    try {
      const response = await this.client.post<PublishResponse>(
        `/${this.config.userId}/threads_publish`,
        {
          creation_id: containerId,
          access_token: this.config.accessToken,
        }
      );

      if (!response.data.id) {
        throw new Error("Media container publication failed: No ID returned");
      }

      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to publish media container: ${
            error.response?.status || error.message
          }`
        );
      }
      throw error;
    }
  }
}

export default ThreadsPublisher;
