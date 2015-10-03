var _ = require('underscore');

module.exports = {
  response : function(statusCode,statusMessage,data,errors)
  {
      return {
        statusCode : statusCode || 200,
        statusMessage : statusMessage || null,
        data : data || null,
        errors : errors || []
      }
  },
  assertPermission : function(context,permission)
  {
    var H = this;
    return function (request,response,next)
    {
      var user = request.authorisedUser;
      if( user && (_.contains(user.permissions[context], permission) || _.contains(user.permissions[context], 'all')) )
        next();
      else
        response.status(403).json(H.response(403,'You do not have the permission to do this action'));
    };
  }
};
