/**
 * WebHID API の型定義
 * TypeScript の標準 DOM lib には含まれていないため独自定義する
 */

interface HIDInputReportEvent extends Event {
  readonly data: DataView;
  readonly device: HIDDevice;
  readonly reportId: number;
}

interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice;
}

interface HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: HIDCollectionInfo[];
  open(): Promise<void>;
  close(): Promise<void>;
  forget(): Promise<void>;
  sendReport(reportId: number, data: BufferSource | Uint8Array): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
  addEventListener(
    type: "inputreport",
    listener: (event: HIDInputReportEvent) => void,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: "inputreport",
    listener: (event: HIDInputReportEvent) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface HIDCollectionInfo {
  usagePage?: number;
  usage?: number;
  type?: number;
  children?: HIDCollectionInfo[];
  inputReports?: HIDReportInfo[];
  outputReports?: HIDReportInfo[];
  featureReports?: HIDReportInfo[];
}

interface HIDReportInfo {
  reportId?: number;
  items?: HIDReportItem[];
}

interface HIDReportItem {
  isAbsolute?: boolean;
  isArray?: boolean;
  isRange?: boolean;
  hasNull?: boolean;
  usages?: number[];
  usageMinimum?: number;
  usageMaximum?: number;
  reportSize?: number;
  reportCount?: number;
  unitExponent?: number;
  unitSystem?: string;
  unitFactorMassExponent?: number;
  unitFactorLengthExponent?: number;
  unitFactorTimeExponent?: number;
  unitFactorTemperatureExponent?: number;
  unitFactorCurrentExponent?: number;
  unitFactorLuminousIntensityExponent?: number;
  logicalMinimum?: number;
  logicalMaximum?: number;
  physicalMinimum?: number;
  physicalMaximum?: number;
  strings?: string[];
}

interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

interface HIDDeviceRequestOptions {
  filters: HIDDeviceFilter[];
  exclusionFilters?: HIDDeviceFilter[];
}

interface HID extends EventTarget {
  requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
  getDevices(): Promise<HIDDevice[]>;
  addEventListener(
    type: "connect" | "disconnect",
    listener: (event: HIDConnectionEvent) => void,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: "connect" | "disconnect",
    listener: (event: HIDConnectionEvent) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface Navigator {
  readonly hid: HID;
}
