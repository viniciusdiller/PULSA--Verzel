declare class EnvironmentVariables {
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN?: string;
    QR_SIGNING_SECRET: string;
    HOLD_TTL_MINUTES: string;
    TICKETMASTER_API_KEY?: string;
    CORS_ORIGIN: string;
    PORT?: string;
    NODE_ENV?: string;
}
export declare function validateEnv(config: Record<string, unknown>): EnvironmentVariables;
export {};
