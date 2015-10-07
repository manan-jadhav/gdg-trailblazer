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
      if( H.hasPermission(request.authorisedUser,context,permission) )
        next();
      else
        response.status(403).json(H.response(403,'You do not have the permission to do this action'));
    };
  },
  hasPermission : function(user,context,permission)
  {
    return user && (_.contains(user.permissions[context], permission) || _.contains(user.permissions[context], 'all'));
  },
  allPermissions : {
    users:['view','update','manage_permissions'],
    events:['view','update','create','view_responses','participate','moderate_participants'],
    self:['view','update']
  }
};
