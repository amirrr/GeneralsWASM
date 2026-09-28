import type { SignalingClientLike } from "../../src/net/webrtc-udp-bridge.js";

type Handler = (...args: never[]) => void;

export class FakeSignalingClient {
  readonly listeners = new Map<string, Set<Handler>>();
  readonly connectCalls: { roomId: string; options: { name?: string; capacity?: number } | undefined }[] = [];
  readonly sentOffers: { to: number; payload: unknown }[] = [];
  readonly sentAnswers: { to: number; payload: unknown }[] = [];
  readonly sentIce: { to: number; payload: unknown }[] = [];
  leaveCalled = false;
  closeCalled = false;

  on(event: string, handler: Handler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  connect(roomId: string, options?: { name?: string; capacity?: number }): void {
    this.connectCalls.push({ roomId, options });
  }

  sendOffer(to: number, payload: unknown): void {
    this.sentOffers.push({ to, payload });
  }

  sendAnswer(to: number, payload: unknown): void {
    this.sentAnswers.push({ to, payload });
  }

  sendIceCandidate(to: number, payload: unknown): void {
    this.sentIce.push({ to, payload });
  }

  leave(): void {
    this.leaveCalled = true;
  }

  close(): void {
    this.closeCalled = true;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const handler of this.listeners.get(event) ?? []) {
      (handler as (...values: unknown[]) => void)(...args);
    }
  }

  asSignalingClientLike(): SignalingClientLike {
    return this as unknown as SignalingClientLike;
  }
}

export type FakeDataChannelState = "connecting" | "open" | "closing" | "closed";

export class FakeDataChannel {
  readyState: FakeDataChannelState = "connecting";
  bufferedAmount = 0;
  binaryType = "blob";
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  readonly sent: Uint8Array[] = [];

  constructor(
    readonly label: string,
    readonly options: RTCDataChannelInit | undefined = undefined,
  ) {}

  send(data: Uint8Array): void {
    if (this.readyState !== "open") throw new Error(`cannot send on a channel in state "${this.readyState}"`);
    this.sent.push(data);
  }

  open(): void {
    this.readyState = "open";
    this.onopen?.();
  }

  close(): void {
    this.readyState = "closed";
    this.onclose?.();
  }

  simulateMessage(data: ArrayBuffer): void {
    this.onmessage?.({ data });
  }
}

export type FakeSignalingState = "stable" | "have-local-offer" | "have-remote-offer";

interface FakeSessionDescription {
  readonly type: string;
  readonly sdp: string;
  toJSON(): { type: string; sdp: string };
}

function makeDescription(type: string, sdp: string): FakeSessionDescription {
  return { type, sdp, toJSON: () => ({ type, sdp }) };
}

export class FakePeerConnection {
  signalingState: FakeSignalingState = "stable";
  connectionState = "new";
  localDescription: FakeSessionDescription | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  onicecandidate: ((event: { candidate: { toJSON(): unknown } | null }) => void) | null = null;
  onnegotiationneeded: (() => void) | null = null;
  ondatachannel: ((event: { channel: FakeDataChannel }) => void) | null = null;
  readonly createdChannels: FakeDataChannel[] = [];
  readonly addedIceCandidates: unknown[] = [];
  private offerCount = 0;

  constructor(readonly config: unknown) {}

  createDataChannel(label: string, options?: RTCDataChannelInit): FakeDataChannel {
    const channel = new FakeDataChannel(label, options);
    this.createdChannels.push(channel);
    queueMicrotask(() => this.onnegotiationneeded?.());
    return channel;
  }

  createOffer(): Promise<FakeSessionDescription> {
    this.offerCount += 1;
    return Promise.resolve(makeDescription("offer", `offer-sdp-${this.offerCount}`));
  }

  createAnswer(): Promise<FakeSessionDescription> {
    return Promise.resolve(makeDescription("answer", "answer-sdp"));
  }

  setLocalDescription(description: FakeSessionDescription): Promise<void> {
    this.localDescription = description;
    this.signalingState = description.type === "offer" ? "have-local-offer" : "stable";
    return Promise.resolve();
  }

  setRemoteDescription(description: { type: string; sdp: string }): Promise<void> {
    this.remoteDescription = description;
    this.signalingState = description.type === "offer" ? "have-remote-offer" : "stable";
    return Promise.resolve();
  }

  addIceCandidate(candidate: unknown): Promise<void> {
    this.addedIceCandidates.push(candidate);
    return Promise.resolve();
  }

  close(): void {
    this.connectionState = "closed";
  }

  emitDataChannel(channel: FakeDataChannel): void {
    this.ondatachannel?.({ channel });
  }
}

export async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}