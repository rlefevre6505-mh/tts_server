import express, { type Express } from "express";
import cors from "cors";
import emailRouter from "./routes/email_routes";
import equipmentRouter from "./routes/equipment_routes";
import eventRouter from "./routes/event_routes";
import shopRouter from "./routes/shop_routes";
import vehicleRouter from "./routes/vehicle_routes";

const app: Express = express();
app.use(express.json());
app.use(cors());
app.use("/email", emailRouter);
app.use("/equipment", equipmentRouter);
app.use("/event", eventRouter);
app.use("/shop", shopRouter);
app.use("/vehicle", vehicleRouter);

const PORT = 8080;
app.get("/", (req, res) =>
  res.json({ message: "Welcome to the Tom The Shop Logistics server" }),
);

app.listen(PORT, () => {
  console.info(`Server is running in port ${PORT}`);
});
