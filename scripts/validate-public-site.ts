import {
  assertGitBackedProductionDeployment,
  assertPublicLaunchReady,
  loadPublicSiteConfig,
} from "../src/lib/site/public-site";

assertPublicLaunchReady(loadPublicSiteConfig());
assertGitBackedProductionDeployment();
console.log("Public site release configuration is valid.");
