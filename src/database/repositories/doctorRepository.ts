import { getDatabase } from '../index';
import { Doctor } from '../../types';

export const doctorRepository = {
  async create(doctor: Doctor): Promise<Doctor> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO doctors (
        id, name_bn, name_en, qualifications, specialization,
        bmdc_registration_number, primary_phone, additional_phones_json,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        doctor.id,
        doctor.name_bn,
        doctor.name_en,
        doctor.qualifications,
        doctor.specialization,
        doctor.bmdc_registration_number,
        doctor.primary_phone,
        doctor.additional_phones_json,
        doctor.notes,
        doctor.created_at,
        doctor.updated_at,
      ]
    );
    return doctor;
  },

  async update(doctor: Doctor): Promise<Doctor> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE doctors SET
        name_bn = ?,
        name_en = ?,
        qualifications = ?,
        specialization = ?,
        bmdc_registration_number = ?,
        primary_phone = ?,
        additional_phones_json = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?;`,
      [
        doctor.name_bn,
        doctor.name_en,
        doctor.qualifications,
        doctor.specialization,
        doctor.bmdc_registration_number,
        doctor.primary_phone,
        doctor.additional_phones_json,
        doctor.notes,
        doctor.updated_at,
        doctor.id,
      ]
    );
    return doctor;
  },

  async getById(id: string): Promise<Doctor | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Doctor>(
      'SELECT * FROM doctors WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  async getAll(): Promise<Doctor[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Doctor>(
      'SELECT * FROM doctors ORDER BY updated_at DESC;'
    );
  },

  async search(query: string): Promise<Doctor[]> {
    const db = await getDatabase();
    const pattern = `%${query.trim()}%`;
    return await db.getAllAsync<Doctor>(
      `SELECT * FROM doctors
       WHERE name_bn LIKE ? OR name_en LIKE ? OR primary_phone LIKE ? OR bmdc_registration_number LIKE ?
       ORDER BY updated_at DESC LIMIT 50;`,
      [pattern, pattern, pattern, pattern]
    );
  },

  async findByPhone(phone: string): Promise<Doctor | null> {
    const db = await getDatabase();
    const clean = phone.replace(/[^0-9]/g, '');
    const pattern = `%${clean.slice(-10)}%`;
    const row = await db.getFirstAsync<Doctor>(
      `SELECT * FROM doctors WHERE primary_phone LIKE ? OR additional_phones_json LIKE ? LIMIT 1;`,
      [pattern, pattern]
    );
    return row ?? null;
  },

  async findByBMDC(bmdc: string): Promise<Doctor | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Doctor>(
      'SELECT * FROM doctors WHERE LOWER(TRIM(bmdc_registration_number)) = LOWER(TRIM(?)) LIMIT 1;',
      [bmdc]
    );
    return row ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM doctors WHERE id = ?;', [id]);
    return result.changes > 0;
  },
};

