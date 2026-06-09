import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../dbconnection";
import type { vehicles } from "../types";
const router = Router();

// get list of all vehicles
router.get(
  "/get-vehicles",
  async function (req: Request, res: Response<vehicles>) {
    try {
      const query = await db.query(`SELECT json_agg(vehicles) AS vehicles
FROM vehicles;`);
      res.json(query.rows[0].vehicles);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  },
);

// Add vehicle
router.post("/add-vehicle", async (req: Request, res: Response) => {
  try {
    const form = req.body;
    await db.query(
      `INSERT INTO vehicles (vehicle_name, vehicle_reg) VALUES ($1, $2)`,
      [form.vehicle_name, form.vehicle_reg],
    );
    res.json({ status: "success", values: form });
  } catch (error) {
    console.error("Error inserting item:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to add item to inventory" });
  }
});

// Edit vehicle details
router.post("/update-vehicle", async (req: Request, res: Response) => {
  const { id, vehicle_name, vehicle_reg } = req.body;
  if (!id || vehicle_name == null || vehicle_reg == null) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await db.query(
      `
      UPDATE vehicles
      SET vehicle_name = $1, vehicle_reg = $2
      WHERE id = $3
      `,
      [vehicle_name, vehicle_reg, id],
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete vehicle
router.post("/delete-vehicle", async (req, res) => {
  const { id } = req.body;
  try {
    await db.query("BEGIN");
    await db.query("DELETE FROM event_vehicles WHERE vehicle_id = $1", [id]);
    await db.query("DELETE FROM vehicles WHERE id = $1", [id]);
    await db.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// get required vehicles
router.get(
  "/get-required-vehicles",
  async function (req: Request, res: Response) {
    try {
      const query = await db.query(`
SELECT 
  rv.id AS required_vehicle_id,
  s.id AS shop_id,
  s.shop_name,
  v.id AS vehicle_id,
  v.vehicle_name
FROM required_vehicles rv
JOIN shops s 
  ON rv.shop_id = s.id
JOIN vehicles v 
  ON rv.vehicle_id = v.id
ORDER BY s.shop_name, v.vehicle_name;
`);
      res.json(query.rows);
    } catch (error) {
      console.error(`Error: ${error}`);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// add vehicle requirement
router.post("/add-required-vehicle", async (req: Request, res: Response) => {
  try {
    const form = req.body;
    await db.query(
      `INSERT INTO required_vehicles (shop_id, vehicle_id) VALUES ($1, $2)`,
      [form.shop_id, form.vehicle_id],
    );
    res.json({ status: "success", values: form });
  } catch (error) {
    console.error("Error inserting item:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to add vehicle requirement" });
  }
});

// Delete vehicle requirement
router.post("/delete-requirement", async (req, res) => {
  const { id } = req.body;
  try {
    await db.query("DELETE FROM required_vehicles WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete requirement" });
  }
});

export default router;
