export const Response = (res, status, body) => {
    if (res && status) {

        switch (status) {
            case 200:
                res.status(200).json({
                    status: 200,
                    messageText: "Success execution",
                    data: body ? body : {}
                });
                break;

            case 201:
                res.status(201).json({
                    status: 201,
                    messageText: "Success execution but traiment pending !",
                    data: body ? body : {}
                });
                break;

            case 205:
                res.status(205).json({
                    status: 205,
                    messageText: "Ressources are in building ",
                    data: body ? body : {}
                });
                break;

            case 402:
                res.status(402).json({
                    status: 402,
                    messageText: "Account not activate !",
                    data: body ? body : {}
                });
                break;

            case 203:
                res.status(203).json({
                    status: 203,
                    messageText: "Login failed credentials are incorrect !",
                    data: body ? body : {}
                });
                break;

            case 244:
                res.status(244).json({
                    status: 244,
                    messageText: "Login failed cause account is not activate",
                    data: body ? body : {}
                });
                break;

            case 404:
                res.status(404).json({
                    status: 404,
                    messageText: "Ressource not found on this server !",
                    data: body ? body : {}
                });
                break;

            case 403:
                res.status(403).json({
                    status: 403,
                    messageText: "You don't have right access to this server ! please check your app and access key",
                    data: body ? body : {}
                })
                break;

            case 400:
                res.status(400).json({
                    status: 400,
                    messageText: "Success execution but nothing to render",
                    data: body ? body : {}
                })
                break;

            case 401:
                res.status(401).json({
                    status: 401,
                    messageText: "missing parameter in the request !",
                    data: body ? body : {}
                });
                break;

            case 405:
                res.status(405).json({
                    status: 405,
                    messageText: "Data validation error !",
                    data: body ? body : {}
                });
                break;

            case 301:
                res.status(403).json({
                    status: 301,
                    messageText: "Session has expired !",
                    data: body ? body : {}
                });
                break;

            case 503:
                res.status(503).json({
                    status: 503,
                    messageText: "An SQL error was occured !",
                    data: body ? body : {}
                })
                break;

            case 204:
                res.status(209).json({
                    status: 209,
                    messageText: "No enougth cash for payement !",
                    data: body ? body : {}
                })
                break;

            case 209:
                res.status(209).json({
                    status: 209,
                    messageText: "No enougth cash for payement !",
                    data: body ? body : {}
                })
                break;

            case 500:
                res.status(500).json({
                    status: 500,
                    messageText: "An internal server error occured !",
                    data: body ? body : {}
                })
                break;

            case 501:
                res.status(501).json({
                    status: 501,
                    messageText: "An unhandled internal server error occured !",
                    data: body ? body : {}
                })
                break;

            default:
                res.status(222).json({
                    status: 222,
                    messageText: "unknown internal server occured on this server | please contact + 243 970 284 772 if the problem persists",
                    data: []
                })
                break;
        }
    } else {
        res.status(222).json({
            status: 222,
            messageText: "missing params to the request ",
            data: "case where missing `res` or `status` object in switch case"
        });
    }
}