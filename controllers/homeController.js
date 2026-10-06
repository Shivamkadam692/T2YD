const Lorry = require('../models/Lorry');
const Delivery = require('../models/Delivery');

/**
 * Render home page
 */
exports.getHome = async (req, res) => {
  try {
    const isTransporter = req.session?.userId && req.session.userRole === 'transporter';
    const lorryQuery = isTransporter 
      ? Lorry.find({ transporter: req.session.userId }).lean() 
      : Lorry.find().lean();
    
    const [lorries, deliveries] = await Promise.all([
      lorryQuery,
      Delivery.find().lean()
    ]);
    
    res.render('index', { lorries, deliveries });
  } catch (error) {
    console.error('Error in getHome:', error);
    res.status(500).render('error', { message: 'Unable to load home page' });
  }
};

/**
 * Handle search
 */
exports.search = async (req, res) => {
  try {
    const query = req.query.query;
    
    // Validate query parameter
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.render('searchResults', { results: [] });
    }
    
    const trimmedQuery = query.trim();
    
    // Base search criteria
    const searchCriteria = {
      $or: [
        { location: { $regex: trimmedQuery, $options: 'i' } },
        { vehicleType: { $regex: trimmedQuery, $options: 'i' } },
        { ownerName: { $regex: trimmedQuery, $options: 'i' } }
      ]
    };
    
    // If user is a transporter, only show their own lorries
    if (req.session.userId && req.session.userRole === 'transporter') {
      searchCriteria.transporter = req.session.userId;
    }
    
    const [lorryResults, deliveryResults] = await Promise.all([
      Lorry.find(searchCriteria).lean(),
      Delivery.find({
        $or: [
          { pickupLocation: { $regex: trimmedQuery, $options: 'i' } },
          { dropLocation: { $regex: trimmedQuery, $options: 'i' } },
          { goodsType: { $regex: trimmedQuery, $options: 'i' } }
        ]
      }).lean()
    ]);
    const results = [...lorryResults, ...deliveryResults];
    res.render('searchResults', { results });
  } catch (error) {
    console.error('Search error:', error);
    // Handle regex errors specifically
    if (error.name === 'MongoServerError' && error.message.includes('$regex')) {
      return res.render('searchResults', { results: [], error: 'Invalid search pattern. Please try a different search term.' });
    }
    // Fallback to showing no results
    res.render('searchResults', { results: [] });
  }
};

