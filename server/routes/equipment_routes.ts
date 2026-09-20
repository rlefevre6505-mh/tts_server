import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../dbconnection";
// import type {} from "../types";
const equipmentRouter = Router();

// get full inventory
equipmentRouter.get(
  "/get-inventory",
  async function (req: Request, res: Response) {
    try {
      const query = await db.query(`SELECT * FROM full_inventory
      ORDER BY equipment_name ASC`);
      res.json(query.rows);
    } catch (error: any) {
      console.error("Error fetching full inventory:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  },
);

// get equipment lists
equipmentRouter.get(
  "/get-equipment-lists",
  async function (req: Request, res: Response) {
    try {
      const query = await db.query(`
SELECT 
  s.id AS shop_id,
  s.shop_name,
  COALESCE(
    json_agg(
      jsonb_build_object(
        'equipment_list_id', el.id,
        'equipment_id', i.id,
        'equipment_name', i.equipment_name,
        'required_amount', el.required_amount
      )
      ORDER BY i.equipment_name
    ) FILTER (WHERE el.id IS NOT NULL),
    '[]'
  ) AS equipment
FROM shops s
LEFT JOIN equipment_lists el ON el.shop_id = s.id
LEFT JOIN full_inventory i ON el.equipment_id = i.id
GROUP BY s.id, s.shop_name
ORDER BY s.shop_name;
`);
      res.json(query.rows);
    } catch (error: any) {
      console.error("Error fetching equipment lists:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  },
);

// Add item to equipment list
equipmentRouter.post(
  "/add-to-equipment-list",
  async (req: Request, res: Response) => {
    try {
      const form = req.body;
      await db.query(
        `INSERT INTO equipment_lists (shop_id, equipment_id, required_amount) VALUES ($1, $2, $3)`,
        [form.shop_id, form.item_id, form.amount],
      );
      res.json({ status: "success", values: form });
    } catch (error: any) {
      console.error("Error adding item to equipment list:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  },
);

// Edit equipment-list details
equipmentRouter.post("/update-equipment-list-item", async (req, res) => {
  const { id, required_amount } = req.body;
  if (!id || required_amount == null) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await db.query(
      `
      UPDATE equipment_lists
      SET required_amount = $1
      WHERE id = $2;
      `,
      [required_amount, id],
    );
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error editing equipment list details:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
  }
});

// Delete item from equipment list
equipmentRouter.post("/delete-equipment-list-item", async (req, res) => {
  const { shop_id, equipment_id } = req.body;
  try {
    const result = await db.query(
      `
      DELETE FROM equipment_lists
      WHERE shop_id = $1 AND equipment_id = $2
      `,
      [shop_id, equipment_id],
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting item from equipment list:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
  }
});

// Add inventory item
equipmentRouter.post(
  "/add-inventory-item",
  async (req: Request, res: Response) => {
    try {
      const form = req.body;
      await db.query(
        `INSERT INTO full_inventory (equipment_name, current_amount) VALUES ($1, $2)`,
        [form.name, form.amount],
      );
      res.json({ status: "success", values: form });
    } catch (error: any) {
      console.error("Error adding inventory item:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  },
);

// Edit inventory item
equipmentRouter.post(
  "/update-inventory",
  async (req: Request, res: Response) => {
    const { id, equipment_name, current_amount } = req.body;
    if (!id || equipment_name == null || current_amount == null) {
      return res.status(400).json({ error: "Missing fields" });
    }
    try {
      await db.query(
        `
      UPDATE full_inventory
      SET equipment_name = $1,
          current_amount = $2
      WHERE id = $3
      `,
        [equipment_name, current_amount, id],
      );
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error editing inventory item:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  },
);

// Delete inventory item
equipmentRouter.post(
  "/delete-inventory",
  async (req: Request, res: Response) => {
    const { id } = req.body;
    try {
      await db.query("BEGIN");
      await db.query("DELETE FROM equipment_lists WHERE equipment_id = $1", [
        id,
      ]);
      await db.query("DELETE FROM full_inventory WHERE id = $1", [id]);
      await db.query("COMMIT");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  },
);

export default equipmentRouter;
