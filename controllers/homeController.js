const Lorry = require('../models/Lorry');
const Delivery = require('../models/Delivery');

/**
 * Render home page
 */
exports.getHome = async (req, res) => {
  let lorries;
  
  // If user is a transporter, only show their own lorries
  if (req.session.userId && req.session.userRole === 'transporter') {
    lorries = await Lorry.find({ transporter: req.session.userId });
  } else {
    // For non-transporters (shippers or guests), show all lorries
    lorries = await Lorry.find();
  }
  
  const deliveries = await Delivery.find();
  res.render('index', { lorries, deliveries });
};

/**
 * Handle search
 */
exports.search = async (req, res) => {
  const query = req.query.query;
  
  // Base search criteria
  const searchCriteria = {
    $or: [
      { location: { $regex: query, $options: 'i' } },
      { vehicleType: { $regex: query, $options: 'i' } },
      { ownerName: { $regex: query, $options: 'i' } }
    ]
  };
  
  // If user is a transporter, only show their own lorries
  if (req.session.userId && req.session.userRole === 'transporter') {
    searchCriteria.transporter = req.session.userId;
  }
  
  const lorryResults = await Lorry.find(searchCriteria);
  const deliveryResults = await Delivery.find({
    $or: [
      { pickupLocation: { $regex: query, $options: 'i' } },
      { dropLocation: { $regex: query, $options: 'i' } },
      { goodsType: { $regex: query, $options: 'i' } }
    ]
  });
  const results = [...lorryResults, ...deliveryResults];
  res.render('searchResults', { results });
};

