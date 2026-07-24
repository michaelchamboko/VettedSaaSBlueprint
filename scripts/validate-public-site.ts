import {
  assertPublicLaunchReady,
  loadPublicSiteConfig,
} from "../src/lib/site/public-site";

assertPublicLaunchReady(loadPublicSiteConfig());
console.log("Public site release configuration is valid.");
