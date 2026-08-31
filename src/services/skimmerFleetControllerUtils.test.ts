import { evaluateSkimmerFleetControl } from './skimmerFleetControllerUtils';

describe('SkimmerFleetControllerUtils', () => {
  it('triggers RETURNING_TO_BASE status when hopper reaches 90% capacity', () => {
    const res = evaluateSkimmerFleetControl('skimmer-01', 'zone-alpha', 460, 500);

    expect(res.vesselId).toBe('skimmer-01');
    expect(res.isHopperFull).toBe(true);
    expect(res.skimmerStatus).toBe('RETURNING_TO_BASE');
    expect(res.bubbleBarrierActive).toBe(true);
  });
});
