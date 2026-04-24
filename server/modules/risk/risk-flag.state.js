const RISK_FLAG_STATES = ['open', 'reviewed', 'dismissed', 'confirmed'];

const RISK_FLAG_TRANSITIONS = {
  open: ['reviewed', 'dismissed', 'confirmed'],
  reviewed: ['dismissed', 'confirmed'],
  dismissed: [],
  confirmed: [],
};

module.exports = {
  RISK_FLAG_STATES,
  RISK_FLAG_TRANSITIONS,
};
