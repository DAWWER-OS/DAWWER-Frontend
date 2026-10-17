/* Contract helpers for server-enforced employee zone assignments. */
const StaffScope = {
  options(response) {
    const data = response?.data ?? response;
    if (data?.contractVersion !== 1 || data?.supportsZoneScope !== true || !Array.isArray(data.zones)) {
      throw new Error('تخصيص الزونات غير متاح حاليًا.');
    }
    const seen = new Set();
    const zones = data.zones.filter(zone => {
      if (!zone || typeof zone.id !== 'string' || !zone.id.trim() || typeof zone.name !== 'string' || !zone.name.trim() || seen.has(zone.id)) return false;
      seen.add(zone.id); return zone.isActive !== false;
    });
    return zones;
  },
  payload(accessScope, zoneIds, zones, supported) {
    if (!['Store', 'Zones'].includes(accessScope)) throw new Error('اختر نطاق عمل الموظف.');
    if (!supported) {
      if (accessScope === 'Zones') throw new Error('تعذر تأكيد دعم تخصيص الزونات من الخادم. أعد تحميل الزونات ثم حاول مجددًا.');
      return {};
    }
    if (accessScope === 'Store') return { accessScope: 'Store', zoneIds: [] };
    const ids = [...new Set(zoneIds)];
    if (!ids.length) throw new Error('اختر زونًا واحدًا على الأقل.');
    if (ids.some(id => !zones.some(zone => zone.id === id))) throw new Error('إحدى الزونات غير متاحة. أعد تحميل الزونات.');
    return { accessScope: 'Zones', zoneIds: ids };
  },
  confirmed(response, expected) {
    if (!expected.accessScope) return true; // Legacy whole-store creation has no zone claim.
    const saved = response?.data ?? response;
    if (saved?.accessScope !== expected.accessScope || !Array.isArray(saved.zoneIds)) return false;
    const actual = [...new Set(saved.zoneIds)].sort();
    const wanted = [...expected.zoneIds].sort();
    return actual.length === wanted.length && actual.every((id, i) => id === wanted[i]);
  }
};
if (typeof module !== 'undefined') module.exports = StaffScope;
