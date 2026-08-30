import { calculateUpwindEvacuationRoute } from './hazmatEvacuationRouterUtils';

describe('HazmatEvacuationRouterUtils', () => {
  it('calculates correct upwind assembly point based on wind direction', () => {
    const route = calculateUpwindEvacuationRoute('facility-evac-01', 90);

    expect(route.facilityId).toBe('facility-evac-01');
    expect(route.upwindDirectionDegrees).toBe(270);
    expect(route.recommendedAssemblyPoint).toBe('West Security Post Assembly Zone D');
    expect(route.sirenAlertActive).toBe(true);
  });
});
