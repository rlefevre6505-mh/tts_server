export type shop = {
  id: number;
  shop_name: string;
};
export type shops = shop[];

export type vehicle = {
  id: number;
  vehicle_name: string;
};
export type vehicles = vehicle[];

export type note = {
  note: string;
};
export type notes = note[];

export type event = {
  id: number;
  title: string;
  start: string;
  end: string;
};

export type FormValues = {
  event_id: number | undefined;
  title: string | undefined;
  start: string | undefined;
  end: string | undefined;
  date_added: Date;
  location: string | undefined;
  num_of_shops: number | undefined;
  shops: shop[];
  num_of_vehicles: number | undefined;
  vehicles: vehicle[];
  notes?: note[];
};

export type eventDetailsObject = {
  id: number;
  title: string;
  start: string;
  end: string;
  date_added: Date;
  location?: string;
  num_of_shops?: number;
  shops?: shop[];
  num_of_vehicles?: number;
  vehicles?: vehicle[];
  notes?: note[];
};
