// utils/Response.js
// Helper unifié pour toutes les réponses HTTP du backend ULPGL.
// Format de réponse :
// { status, messageText, data }
//
// Convention pour `body` :
//   - Liste     : { length: rows.length, rows: [...] }
//   - Détail    : { item: {...} }   (ou directement les champs)
//   - Auth      : { token, user }
//   - Stats     : { total, pending, ... }
//   - Erreurs   : { reason: '...' }  (optionnel — messageText vient du switch)

const STATUS_MESSAGES = {
  200: 'Success execution',
  201: 'Success execution but traiment pending !',
  205: 'Ressources are in building ',
  402: 'Account not activate !',
  203: 'Login failed credentials are incorrect !',
  244: 'Login failed cause account is not activate',
  404: 'Ressource not found on this server !',
  403: "Username or password is incorrect, check them than try again !",
  400: 'Success execution but nothing to render',
  401: 'missing parameter in the request !',
  405: 'Data validation error !',
  301: 'Session has expired !',
  503: 'An SQL error was occured !',
  204: 'No enougth cash for payement !',
  209: 'No enougth cash for payement !',
  500: 'An internal server error occured !',
  501: 'An unhandled internal server error occured !',
};

const Response = (res, status, body) => {
  if (!res || !status) {
    return res?.status(222)?.json({
      status: 222,
      messageText: 'missing params to the request ',
      data: 'case where missing `res` or `status` object in switch case',
    });
  }

  const httpStatus = status === 301 ? 403 : status === 204 ? 209 : status;
  const payloadStatus = status === 204 ? 209 : status;
  const messageText = STATUS_MESSAGES[status];

  if (messageText !== undefined) {
    return res.status(httpStatus).json({
      status: payloadStatus,
      messageText,
      data: body || {},
    });
  }

  return res.status(222).json({
    status: 222,
    messageText:
      'unknown internal server occured on this server | please contact + 243 970 284 772 if the problem persists',
    data: [],
  });
};

module.exports = { Response, STATUS_MESSAGES };
