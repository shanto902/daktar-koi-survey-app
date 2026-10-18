import { getDatabase } from '../index';
import { Facility } from '../../types';

export const facilityRepository = {
  async create(facility: Facility): Promise<Facility> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO facilities (
        id, name_bn, name_en, facility_type, address, division,
        district, upazila, contact_numbers_json, opening_hours_json,
        latitude, longitude, gps_accuracy_meters, location_captured_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        facility.id,
        facility.name_bn,
        facility.name_en,
        facility.facility_type,
        facility.address,
        facility.division,
        facility.district,
        facility.upazila,
        facility.contact_numbers_json,
        facility.opening_hours_json,
        facility.latitude,
        facility.longitude,
        facility.gps_accuracy_meters,
        facility.location_captured_at,
        facility.created_at,
        facility.updated_at,
      ]
    );
    return facility;
  },

  async update(facility: Facility): Promise<Facility> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE facilities SET
        name_bn = ?,
        name_en = ?,
        facility_type = ?,
        address = ?,
        division = ?,
        district = ?,
        upazila = ?,
        contact_numbers_json = ?,
        opening_hours_json = ?,
        latitude = ?,
        longitude = ?,
        gps_accuracy_meters = ?,
        location_captured_at = ?,
        updated_at = ?
      WHERE id = ?;`,
      [
        facility.name_bn,
        facility.name_en,
        facility.facility_type,
        facility.address,
        facility.division,
        facility.district,
        facility.upazila,
        facility.contact_numbers_json,
        facility.opening_hours_json,
        facility.latitude,
        facility.longitude,
        facility.gps_accuracy_meters,
        facility.location_captured_at,
        facility.updated_at,
        facility.id,
      ]
    );
    return facility;
  },

  async getById(id: string): Promise<Facility | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Facility>(
      'SELECT * FROM facilities WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  async getAll(): Promise<Facility[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Facility>(
      'SELECT * FROM facilities ORDER BY updated_at DESC;'
    );
  },

  async search(query: string): Promise<Facility[]> {
    const db = await getDatabase();
    const pattern = `%${query.trim()}%`;
    return await db.getAllAsync<Facility>(
      `SELECT * FROM facilities
       WHERE name_bn LIKE ? OR name_en LIKE ? OR address LIKE ? OR district LIKE ?
       ORDER BY updated_at DESC LIMIT 50;`,
      [pattern, pattern, pattern, pattern]
    );
  },

  async findByName(name: string): Promise<Facility | null> {
    const db = await getDatabase();
    const clean = name.trim();
    const row = await db.getFirstAsync<Facility>(
      'SELECT * FROM facilities WHERE LOWER(name_en) = LOWER(?) OR LOWER(name_bn) = LOWER(?) LIMIT 1;',
      [clean, clean]
    );
    return row ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM facilities WHERE id = ?;', [id]);
    return result.changes > 0;
  },
};

