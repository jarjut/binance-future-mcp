import express, { NextFunction, Request, Response } from "express";
import * as binanceService from "./binance-service";

const app = express();
const port = process.env.PORT || 3000;

const handleBinanceError = (res: Response, e: any) => {
	const code = e.code;
	const message = e.message || "Binance API Error";

	if (code === "API-ERROR") {
		// Binance API-ERROR can be generic, but we can check the message
		if (message.includes("invalid") || message.includes("parameter")) {
			return res.status(400).json({ error: message });
		}
	}

	if (code === -1003 || message.includes("auth")) {
		return res.status(401).json({ error: "Authentication failed" });
	}

	if (code === -1003 || code === -1102 || message.includes("rate limit")) {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	if (code === -1121 || message.includes("precision")) {
		return res.status(400).json({ error: "Invalid precision or parameter" });
	}

	// Default Binance gateway errors to 502, others to 500
	const status = code ? 502 : 500;
	return res.status(status).json({ error: message });
};

const checkAuth = (req: Request, res: Response, next: NextFunction) => {
	if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
		return res.status(401).json({ error: "API credentials missing in .env" });
	}
	next();
};

app.use(checkAuth);

app.get("/account/balance", async (req: Request, res: Response) => {
	try {
		const balances = await binanceService.getAccountBalance();
		res.json(balances);
	} catch (e) {
		handleBinanceError(res, e);
	}
});

app.get("/account/pnl", async (req: Request, res: Response) => {
	try {
		const pnl = await binanceService.getAccountPnL();
		res.json(pnl);
	} catch (e) {
		handleBinanceError(res, e);
	}
});

app.get("/account/positions", async (req: Request, res: Response) => {
	try {
		const positions = await binanceService.getAccountPositions();
		res.json(positions);
	} catch (e) {
		handleBinanceError(res, e);
	}
});

app.get("/account/open-orders", async (req: Request, res: Response) => {
	try {
		const orders = await binanceService.getOpenOrders();
		res.json(orders);
	} catch (e) {
		handleBinanceError(res, e);
	}
});

app.get("/account/trade-history", async (req: Request, res: Response) => {
	try {
		const symbol = req.query.symbol;
		if (typeof symbol !== "string") {
			return res.status(400).json({
				error: "Query parameter 'symbol' is required and must be a string",
			});
		}
		const trades = await binanceService.getTradeHistory(symbol);
		res.json(trades);
	} catch (e) {
		handleBinanceError(res, e);
	}
});

// General error handler for 500s
app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
	) => {
		console.error(err.stack);
		res.status(500).json({ error: "Internal Server Error" });
	},
);

// ponytail: skip custom serverless wrapper; Vercel natively supports exported Express app
export default app;

if (!process.env.VERCEL) {
	app.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`);
	});
}
