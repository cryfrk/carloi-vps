const SUBSCRIPTION_STATES = ['inactive', 'trial', 'active', 'past_due', 'cancelled'];

const SUBSCRIPTION_TRANSITIONS = {
  inactive: ['trial', 'active'],
  trial: ['active', 'cancelled'],
  active: ['past_due', 'cancelled'],
  past_due: ['active', 'cancelled'],
  cancelled: ['inactive', 'active'],
};

module.exports = {
  SUBSCRIPTION_STATES,
  SUBSCRIPTION_TRANSITIONS,
};
