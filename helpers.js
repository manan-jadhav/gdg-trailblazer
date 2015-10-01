module.exports = {
  response : function(statusCode,statusMessage,data,errors)
  {
      return {
        statusCode : statusCode || 200,
        statusMessage : statusMessage || null,
        data : data || null,
        errors : errors || []
      }
  }
}
