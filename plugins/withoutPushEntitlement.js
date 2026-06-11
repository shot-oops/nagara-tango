// Local config plugin: strip the `aps-environment` (Push Notifications) entitlement.
// This app uses LOCAL notifications only — expo-notifications auto-adds the push
// entitlement, which a free Apple Developer account can't sign. Removing it lets
// the app build & run with a personal team.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.modResults && 'aps-environment' in cfg.modResults) {
      delete cfg.modResults['aps-environment'];
    }
    return cfg;
  });
};
