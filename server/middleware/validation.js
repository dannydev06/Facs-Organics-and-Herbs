// Validation middleware for request data

const validateProduct = (req, res, next) => {
  const { name, price, category, description } = req.body;
  
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }
  
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }
  
  next();
};

const validateOrder = (req, res, next) => {
  const { items, shippingAddress, paymentMethod } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }
  
  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
      !shippingAddress.state || !shippingAddress.zipCode) {
    return res.status(400).json({ error: 'Valid shipping address is required' });
  }
  
  if (!paymentMethod) {
    return res.status(400).json({ error: 'Payment method is required' });
  }
  
  // Validate each item in the order
  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: 'Each item must have a productId and positive quantity' });
    }
  }
  
  next();
};

const validateUserUpdate = (req, res, next) => {
  const { name, email, phone, addresses } = req.body;
  
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  
  if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }
  
  if (addresses && Array.isArray(addresses)) {
    for (const address of addresses) {
      if (!address.street || !address.city || !address.state || !address.zipCode) {
        return res.status(400).json({ error: 'Each address must have street, city, state, and zipCode' });
      }
    }
  }
  
  next();
};

module.exports = { validateProduct, validateOrder, validateUserUpdate };