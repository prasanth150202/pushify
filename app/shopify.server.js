import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { restResources } from "@shopify/shopify-api/rest/admin/2023-10";


// shopify.server.js
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  
  billing: {
  STARTER_PLAN: {
    amount: 5.99,        // $5.99
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
    test: true,
  },
  GROWTH_PLAN: {
    amount: 17.99,       // $17.99
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
    test: true,
  },
  PRO_PLAN: {
    amount: 32.99,       // $32.99
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
    test: true,
  },
},


});

export default shopify;
export const apiVersion = ApiVersion.January25;
// export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

// Export plan constants for use in routes
export const STARTER_PLAN = "STARTER_PLAN";
export const GROWTH_PLAN = "GROWTH_PLAN";
export const PRO_PLAN = "PRO_PLAN";
