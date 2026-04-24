function createPlaceholderContract(domain, layer, methods) {
  return methods.reduce((accumulator, methodName) => {
    accumulator[methodName] = async (...args) => ({
      domain,
      layer,
      method: methodName,
      implemented: false,
      args,
    });
    return accumulator;
  }, {});
}

module.exports = {
  createPlaceholderContract,
};
