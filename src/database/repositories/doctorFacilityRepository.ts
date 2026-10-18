import { getDatabase } from '../index';
import { DoctorFacility } from '../../types';

export const doctorFacilityRepository = {
  async create(docFac: DoctorFacility): Promise<DoctorFacility> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO doctor_facilities (
        id, doctor_id, facility_id, visiting_days_json,
        visiting_start_time, visiting_end_time, appointment_phone,
        consultation_fee, verification_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        docFac.id,
        docFac.doctor_id,
        docFac.facility_id,
        docFac.visiting_days_json,
        docFac.visiting_start_time,
        docFac.visiting_end_time,
        docFac.appointment_phone,
        docFac.consultation_fee,
        docFac.verification_status,
        docFac.created_at,
        docFac.updated_at,
      ]
    );
    return docFac;
  },

  async update(docFac: DoctorFacility): Promise<DoctorFacility> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE doctor_facilities SET
        doctor_id = ?,
        facility_id = ?,
        visiting_days_json = ?,
        visiting_start_time = ?,
        visiting_end_time = ?,
        appointment_phone = ?,
        consultation_fee = ?,
        verification_status = ?,
        updated_at = ?
      WHERE id = ?;`,
      [
        docFac.doctor_id,
        docFac.facility_id,
        docFac.visiting_days_json,
        docFac.visiting_start_time,
        docFac.visiting_end_time,
        docFac.appointment_phone,
        docFac.consultation_fee,
        docFac.verification_status,
        docFac.updated_at,
        docFac.id,
      ]
    );
    return docFac;
  },

  async getByDoctorId(doctorId: string): Promise<DoctorFacility[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DoctorFacility>(
      'SELECT * FROM doctor_facilities WHERE doctor_id = ? ORDER BY updated_at DESC;',
      [doctorId]
    );
  },

  async getByFacilityId(facilityId: string): Promise<DoctorFacility[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DoctorFacility>(
      'SELECT * FROM doctor_facilities WHERE facility_id = ? ORDER BY updated_at DESC;',
      [facilityId]
    );
  },

  async getByDoctorAndFacility(
    doctorId: string,
    facilityId: string
  ): Promise<DoctorFacility | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<DoctorFacility>(
      'SELECT * FROM doctor_facilities WHERE doctor_id = ? AND facility_id = ? LIMIT 1;',
      [doctorId, facilityId]
    );
    return row ?? null;
  },

  async getAll(): Promise<DoctorFacility[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DoctorFacility>('SELECT * FROM doctor_facilities;');
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM doctor_facilities WHERE id = ?;', [id]);
    return result.changes > 0;
  },
};

