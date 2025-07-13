
import { OrderItem, PackingLogEntry, InventoryItem, Employee, QCEntry, MoldingLogEntry, RawMaterial, BillOfMaterial, Machine, MaintenanceLog, Supplier, PurchaseOrder, Shipment, Product, AppSettings, AppRole, Customer, Complaint } from '../types';
import { CTElectricLogo } from '../assets/logo';

const ORDERS_KEY = 'packing_orders';
const LOGS_KEY = 'packing_logs';
const MOLDING_LOGS_KEY = 'molding_logs';
const INVENTORY_KEY = 'packing_inventory';
const EMPLOYEES_KEY = 'packing_employees';
const QC_KEY = 'packing_qc_entries';
const RAW_MATERIALS_KEY = 'packing_raw_materials';
const BOMS_KEY = 'packing_boms';
const MACHINES_KEY = 'factory_machines';
const MAINTENANCE_LOGS_KEY = 'maintenance_logs';
const SUPPLIERS_KEY = 'factory_suppliers';
const PURCHASE_ORDERS_KEY = 'factory_purchase_orders';
const SHIPMENTS_KEY = 'factory_shipments';
const PRODUCTS_KEY = 'factory_products';
const SETTINGS_KEY = 'factory_settings';
const READ_NOTIFICATIONS_KEY = 'read_notifications';
const CUSTOMERS_KEY = 'factory_customers';
const COMPLAINTS_KEY = 'factory_complaints';

const DEFAULT_PRODUCTS: Product[] = [
    { id: 'a0b1c2d3-e4f5-g6h7-i8j9-k0l1m2n3o4p5', name: 'บล็อคลอย G-Power 2x4', color: 'สีขาว', salePrice: 3.69, cycleTimeSeconds: 12 },
    { id: 'b1c2d3e4-f5g6-h7i8-j9k0-l1m2n3o4p5q6', name: 'บล็อคลอย G-Power 4x4', color: 'สีขาว', salePrice: 5.08, cycleTimeSeconds: 15 },
    { id: 'c2d3e4f5-g6h7-i8j9-k0l1-m2n3o4p5q6r7', name: 'บล็อคลอย G-Power 2x4B', color: 'สีขาว', salePrice: 3.7, cycleTimeSeconds: 12 },
    { id: 'd3e4f5g6-h7i8-j9k0-l1m2-n3o4p5q6r7s8', name: 'บล็อคลอย G-Power 4x4B', color: 'สีขาว', salePrice: 5.2, cycleTimeSeconds: 15 },
    { id: 'e4f5g6h7-i8j9-k0l1-m2n3-o4p5q6r7s8t9', name: 'บล็อคลอย CT 2x4', color: 'สีขาว', salePrice: 3.83, cycleTimeSeconds: 12 },
    { id: 'f5g6h7i8-j9k0-l1m2-n3o4-p5q6r7s8t9u0', name: 'บล็อคลอย CT 4x4', color: 'สีขาว', salePrice: 5.08, cycleTimeSeconds: 15 },
    { id: 'g6h7i8j9-k0l1-m2n3-o4p5-q6r7s8t9u0v1', name: 'บล็อคลอย CT 2x4B', color: 'สีขาว', salePrice: 3.7, cycleTimeSeconds: 12 },
    { id: 'h7i8j9k0-l1m2-n3o4-p5q6-r7s8t9u0v1w2', name: 'บล็อคลอย CT 4x4B', color: 'สีขาว', salePrice: 5.2, cycleTimeSeconds: 15 },
    { id: 'i8j9k0l1-m2n3-o4p5-q6r7-s8t9u0v1w2x3', name: 'ฝาหน้ากาก CT A-101', color: 'สีขาว', salePrice: 3.77, cycleTimeSeconds: 8 },
    { id: 'j9k0l1m2-n3o4-p5q6-r7s8-t9u0v1w2x3y4', name: 'ฝาหน้ากาก CT A-101B', color: 'สีขาว', salePrice: 0, cycleTimeSeconds: 8 },
    { id: 'k0l1m2n3-o4p5-q6r7-s8t9-u0v1w2x3y4z5', name: 'ฝาหน้ากาก CT A-102', color: 'สีขาว', salePrice: 3.7, cycleTimeSeconds: 8 },
    { id: 'l1m2n3o4-p5q6-r7s8-t9u0-v1w2x3y4z5a6', name: 'ฝาหน้ากาก CT A-102B', color: 'สีขาว', salePrice: 3.7, cycleTimeSeconds: 8 },
    { id: 'm2n3o4p5-q6r7-s8t9-u0v1-w2x3y4z5a6b7', name: 'ฝาหน้ากาก CT A-103', color: 'สีขาว', salePrice: 3.57, cycleTimeSeconds: 8 },
    { id: 'n3o4p5q6-r7s8-t9u0-v1w2-x3y4z5a6b7c8', name: 'ฝาหน้ากาก CT A-103B', color: 'สีขาว', salePrice: 3.35, cycleTimeSeconds: 8 },
    { id: 'o4p5q6r7-s8t9-u0v1-w2x3-y4z5a6b7c8d9', name: 'ฝาหน้ากาก CT A-1022', color: 'สีขาว', salePrice: 3.92, cycleTimeSeconds: 9 },
    { id: 'p5q6r7s8-t9u0-v1w2-x3y4-z5a6b7c8d9e0', name: 'ฝาหน้ากาก CT A-1022B', color: 'สีขาว', salePrice: 3.66, cycleTimeSeconds: 9 },
    { id: 'q6r7s8t9-u0v1-w2x3-y4z5-a6b7c8d9e0f1', name: 'ฝาหน้ากาก CT A-104', color: 'สีขาว', salePrice: 4.92, cycleTimeSeconds: 10 },
    { id: 'r7s8t9u0-v1w2-x3y4-z5a6-b7c8d9e0f1g2', name: 'ฝาหน้ากาก CT A-106', color: 'สีขาว', salePrice: 5.02, cycleTimeSeconds: 10 },
    { id: 's8t9u0v1-w2x3-y4z5-a6b7-c8d9e0f1g2h3', name: 'ฝาหน้ากาก CT A-104B', color: 'สีขาว', salePrice: 0, cycleTimeSeconds: 10 },
    { id: 't9u0v1w2-x3y4-z5a6-b7c8-d9e0f1g2h3i4', name: 'ฝาหน้ากาก CT A-106B', color: 'สีขาว', salePrice: 0, cycleTimeSeconds: 10 },
    { id: 'u0v1w2x3-y4z5-a6b7-c8d9-e0f1g2h3i4j5', name: 'บล็อคลอย BEWON 2x4', color: 'สีขาว', salePrice: 3.83, cycleTimeSeconds: 12 },
    { id: 'v1w2x3y4-z5a6-b7c8-d9e0-f1g2h3i4j5k6', name: 'บล็อคลอย BEWON 4x4', color: 'สีขาว', salePrice: 5.32, cycleTimeSeconds: 15 },
    { id: 'w2x3y4z5-a6b7-c8d9-e0f1-g2h3i4j5k6l7', name: 'ฝาหน้ากาก BEWON 201', color: 'สีขาว', salePrice: 3.68, cycleTimeSeconds: 8 },
    { id: 'x3y4z5a6-b7c8-d9e0-f1g2-h3i4j5k6l7m8', name: 'ฝาหน้ากาก BEWON 202', color: 'สีขาว', salePrice: 3.6, cycleTimeSeconds: 8 },
    { id: 'y4z5a6b7-c8d9-e0f1-g2h3-i4j5k6l7m8n9', name: 'ฝาหน้ากาก BEWON 203', color: 'สีขาว', salePrice: 3.57, cycleTimeSeconds: 8 },
    { id: 'z5a6b7c8-d9e0-f1g2-h3i4-j5k6l7m8n9o0', name: 'ฝาหน้ากาก BEWON 222', color: 'สีขาว', salePrice: 3.84, cycleTimeSeconds: 9 },
    { id: 'a6b7c8d9-e0f1-g2h3-i4j5-k6l7m8n9o0p1', name: 'ฝาหน้ากาก BEWON 604', color: 'สีขาว', salePrice: 5.29, cycleTimeSeconds: 10 },
    { id: 'b7c8d9e0-f1g2-h3i4-j5k6-l7m8n9o0p1q2', name: 'ฝาหน้ากาก BEWON 606', color: 'สีขาว', salePrice: 5.22, cycleTimeSeconds: 10 },
    { id: 'c8d9e0f1-g2h3-i4j5-k6l7-m8n9o0p1q2r3', name: 'ฝา CHONG-2 PC', color: 'เทาใส', salePrice: 4.01, cycleTimeSeconds: 7 },
    { id: 'd9e0f1g2-h3i4-j5k6-l7m8-n9o0p1q2r3s4', name: 'ฝา CHONG-4 PC', color: 'เทาใส', salePrice: 6.73, cycleTimeSeconds: 9 },
    { id: 'e0f1g2h3-i4j5-k6l7-m8n9-o0p1q2r3s4t5', name: 'ฝา CHONG-6 PC', color: 'เทาใส', salePrice: 8.78, cycleTimeSeconds: 10 },
    { id: 'f1g2h3i4-j5k6-l7m8-n9o0-p1q2r3s4t5u6', name: 'ฝา CHONG-8 PC', color: 'เทาใส', salePrice: 10.58, cycleTimeSeconds: 11 },
    { id: 'g2h3i4j5-k6l7-m8n9-o0p1-q2r3s4t5u6v7', name: 'ฝา CHONG-10 PC', color: 'เทาใส', salePrice: 12.06, cycleTimeSeconds: 12 },
    { id: 'h3i4j5k6-l7m8-n9o0-p1q2-r3s4t5u6v7w8', name: 'ฝา CHONG-2 ABS', color: 'สีขาว', salePrice: 6.75, cycleTimeSeconds: 7 },
    { id: 'i4j5k6l7-m8n9-o0p1-q2r3-s4t5u6v7w8x9', name: 'ฝา CHONG-4 ABS', color: 'สีขาว', salePrice: 9.85, cycleTimeSeconds: 9 },
    { id: 'j5k6l7m8-n9o0-p1q2-r3s4-t5u6v7w8x9y0', name: 'ฝา CHONG-6 ABS', color: 'สีขาว', salePrice: 11.62, cycleTimeSeconds: 10 },
    { id: 'k6l7m8n9-o0p1-q2r3-s4t5-u6v7w8x9y0z1', name: 'ฝา CHONG-8 ABS', color: 'สีขาว', salePrice: 13.04, cycleTimeSeconds: 11 },
    { id: 'l7m8n9o0-p1q2-r3s4-t5u6-v7w8x9y0z1a2', name: 'ฝา CHONG-10 ABS', color: 'สีขาว', salePrice: 14.6, cycleTimeSeconds: 12 },
    { id: 'm8n9o0p1-q2r3-s4t5-u6v7-w8x9y0z1a2b3', name: 'CTU ฝา NEW 2 PC', color: 'ดำใส', salePrice: 4.74, cycleTimeSeconds: 7 },
    { id: 'n9o0p1q2-r3s4-t5u6-v7w8-x9y0z1a2b3c4', name: 'CTU ฝา NEW 4 PC', color: 'ดำใส', salePrice: 5.97, cycleTimeSeconds: 8 },
    { id: 'o0p1q2r3-s4t5-u6v7-w8x9-y0z1a2b3c4d5', name: 'CTU ฝา NEW 6 PC', color: 'ดำใส', salePrice: 6.54, cycleTimeSeconds: 9 },
    { id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', name: 'CTU ฝา NEW 8 PC', color: 'ดำใส', salePrice: 7.4, cycleTimeSeconds: 10 },
    { id: 'q2r3s4t5-u6v7-w8x9-y0z1-a2b3c4d5e6f7', name: 'CTU ฝา NEW 10 PC', color: 'ดำใส', salePrice: 10, cycleTimeSeconds: 11 },
    { id: 'r3s4t5u6-v7w8-x9y0-z1a2-b3c4d5e6f7g8', name: 'CTU ฝา NEW 2 PC', color: 'สีขาว', salePrice: 8.8, cycleTimeSeconds: 7 },
    { id: 's4t5u6v7-w8x9-y0z1-a2b3-c4d5e6f7g8h9', name: 'CTU ฝา NEW 4 PC', color: 'สีขาว', salePrice: 14.87, cycleTimeSeconds: 8 },
    { id: 't5u6v7w8-x9y0-z1a2-b3c4-d5e6f7g8h9i0', name: 'CTU ฝา NEW 6 PC', color: 'สีขาว', salePrice: 16.7, cycleTimeSeconds: 9 },
    { id: 'u6v7w8x9-y0z1-a2b3-c4d5-e6f7g8h9i0j1', name: 'CTU ฝา NEW 8 PC', color: 'สีขาว', salePrice: 17.96, cycleTimeSeconds: 10 },
    { id: 'v7w8x9y0-z1a2-b3c4-d5e6-f7g8h9i0j1k2', name: 'CTU ฝา NEW 10 PC', color: 'สีขาว', salePrice: 23.53, cycleTimeSeconds: 11 },
    { id: 'w8x9y0z1-a2b3-c4d5-e6f7-g8h9i0j1k2l3', name: 'อุปกร์ฝาใส่ตู้', color: 'สีขาว', salePrice: 0.44, cycleTimeSeconds: 3 },
    { id: 'x9y0z1a2-b3c4-d5e6-f7g8-h9i0j1k2l3m4', name: 'ฝา M 4', color: 'ใส', salePrice: 6.73, cycleTimeSeconds: 8 },
    { id: 'y0z1a2b3-c4d5-e6f7-g8h9-i0j1k2l3m4n5', name: 'ฝา M 6', color: 'ใส', salePrice: 7.88, cycleTimeSeconds: 9 },
    { id: 'z1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', name: 'ฝา M 8', color: 'ใส', salePrice: 9.6, cycleTimeSeconds: 10 },
    { id: 'a2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', name: 'ฝา M 10', color: 'ใส', salePrice: 10.58, cycleTimeSeconds: 11 },
    { id: 'b3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', name: 'ฝา M 12', color: 'ใส', salePrice: 11.16, cycleTimeSeconds: 12 },
    { id: 'c4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', name: 'ฝา M 4', color: 'เทาใส', salePrice: 12.74, cycleTimeSeconds: 8 },
    { id: 'd5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', name: 'ฝา M 6', color: 'เทาใส', salePrice: 14.84, cycleTimeSeconds: 9 },
    { id: 'e6f7g8h9-i0j1-k2l3-m4n5-o6p7q8r9s0t1', name: 'ฝา M 8', color: 'เทาใส', salePrice: 17.97, cycleTimeSeconds: 10 },
    { id: 'f7g8h9i0-j1k2-l3m4-n5o6-p7q8r9s0t1u2', name: 'ฝา M 10', color: 'เทาใส', salePrice: 19.77, cycleTimeSeconds: 11 },
    { id: 'g8h9i0j1-k2l3-m4n5-o6p7-q8r9s0t1u2v3', name: 'ฝา M 12', color: 'เทาใส', salePrice: 20.82, cycleTimeSeconds: 12 },
    { id: 'h9i0j1k2-l3m4-n5o6-p7q8-r9s0t1u2v3w4', name: 'ชุดล็อคเลือนเลื่อนเปิด-ปิด K1', color: 'สีขาว', salePrice: 0.58, cycleTimeSeconds: 4 },
    { id: 'i0j1k2l3-m4n5-o6p7-q8r9-s0t1u2v3w4x5', name: 'ชุดฐานล็อคเลือนเลื่อนเปิด-ปิด K2', color: 'สีขาว', salePrice: 0.77, cycleTimeSeconds: 4 },
    { id: 'j1k2l3m4-n5o6-p7q8-r9s0-t1u2v3w4x5y6', name: 'ฐานรองเบเกอร์เมน R1', color: 'สีขาว', salePrice: 5.05, cycleTimeSeconds: 9 },
    { id: 'k2l3m4n5-o6p7-q8r9-s0t1-u2v3w4x5y6z7', name: 'ฝาบิดบัสบาร์เมน R1-1', color: 'สีขาว', salePrice: 0.92, cycleTimeSeconds: 5 },
    { id: 'l3m4n5o6-p7q8-r9s0-t1u2-v3w4x5y6z7a8', name: 'ฐานรองเบรคย่อย T1', color: 'สีขาว', salePrice: 1.97, cycleTimeSeconds: 6 },
    { id: 'm4n5o6p7-q8r9-s0t1-u2v3-w4x5y6z7a8b9', name: 'ฝาปิดบัสบาร์ 2 ช่อง T1-1', color: 'สีขาว', salePrice: 0.36, cycleTimeSeconds: 4 },
    { id: 'n5o6p7q8-r9s0-t1u2-v3w4-x5y6z7a8b9c0', name: 'ขาล็อคข้อพับเปิด-ปิดฝา S1', color: 'สีขาว', salePrice: 0.33, cycleTimeSeconds: 3 },
    { id: 'o6p7q8r9-s0t1-u2v3-w4x5-y6z7a8b9c0d1', name: 'ขาพับเปิด-ปิดฝา S2', color: 'สีขาว', salePrice: 0.35, cycleTimeSeconds: 3 },
    { id: 'p7q8r9s0-t1u2-v3w4-x5y6-z7a8b9c0d1e2', name: 'ฐานรองเบเกอร์ 4 ช่อง C1', color: 'สีขาว', salePrice: 3.65, cycleTimeSeconds: 8 },
    { id: 'q8r9s0t1-u2v3-w4x5-y6z7-a8b9c0d1e2f3', name: 'ฝาปิดบัสบาร์ C1-1', color: 'สีขาว', salePrice: 0.56, cycleTimeSeconds: 4 },
    { id: 'r9s0t1u2-v3w4-x5y6-z7a8-b9c0d1e2f3g4', name: 'ฐานรองขั้วต่อสาย J1', color: 'สีขาว', salePrice: 1.01, cycleTimeSeconds: 5 },
    { id: 's0t1u2v3-w4x5-y6z7-a8b9-c0d1e2f3g4h5', name: 'ฐานรองขั้วต่อสาย J2', color: 'สีขาว', salePrice: 1.63, cycleTimeSeconds: 6 },
    { id: 't1u2v3w4-x5y6-z7a8-b9c0-d1e2f3g4h5i6', name: 'CNT เบรคเกอร์', color: 'สีขาว', salePrice: 4.53, cycleTimeSeconds: 8 },
    { id: 'u2v3w4x5-y6z7-a8b9-c0d1-e2f3g4h5i6j7', name: 'CWS-111 ฝาครอบด้านหน้า', color: 'สีขาว', salePrice: 0.49, cycleTimeSeconds: 4 },
    { id: 'v3w4x5y6-z7a8-b9c0-d1e2-f3g4h5i6j7k8', name: 'CWS-111 ฝาครอบด้านหน้า', color: 'สีดำ', salePrice: 0, cycleTimeSeconds: 4 },
    { id: 'w4x5y6z7-a8b9-c0d1-e2f3-g4h5i6j7k8l9', name: 'CWS-111 ฝาครอบด้านหลัง', color: 'สีขาว', salePrice: 0.78, cycleTimeSeconds: 5 },
    { id: 'x5y6z7a8-b9c0-d1e2-f3g4-h5i6j7k8l9m0', name: 'CWS-111 ชุดขาล็อคฝาครอบ', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'y6z7a8b9-c0d1-e2f3-g4h5-i6j7k8l9m0n1', name: 'CWS-111 ชุดล็อคขาเสียบ 2 ต่อ', color: 'สีขาว', salePrice: 0.32, cycleTimeSeconds: 3 },
    { id: 'z7a8b9c0-d1e2-f3g4-h5i6-j7k8l9m0n1o2', name: 'CWS-111 รองฝาเปิด-ปิดด้านในใหญ่', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'a8b9c0d1-e2f3-g4h5-i6j7-k8l9m0n1o2p3', name: 'CWS-111 รองฝาเปิด-ปิดด้านในเล็ก', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'b9c0d1e2-f3g4-h5i6-j7k8-l9m0n1o2p3q4', name: 'CWS-121 ฝาครอบด้านหน้า', color: 'สีขาว', salePrice: 0.49, cycleTimeSeconds: 4 },
    { id: 'c0d1e2f3-g4h5-i6j7-k8l9-m0n1o2p3q4r5', name: 'CWS-121 ฝาครอบด้านหน้า', color: 'สีดำ', salePrice: 0, cycleTimeSeconds: 4 },
    { id: 'd1e2f3g4-h5i6-j7k8-l9m0-n1o2p3q4r5s6', name: 'CWS-121 ฝาครอบด้านหลัง', color: 'สีขาว', salePrice: 0.78, cycleTimeSeconds: 5 },
    { id: 'e2f3g4h5-i6j7-k8l9-m0n1-o2p3q4r5s6t7', name: 'CWS-121 ชุดขาล็อคฝาครอบ', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'f3g4h5i6-j7k8-l9m0-n1o2-p3q4r5s6t7u8', name: 'CWS-121 ชุดล็อคขาเสียบ 2 ต่อ', color: 'สีขาว', salePrice: 0.32, cycleTimeSeconds: 3 },
    { id: 'g4h5i6j7-k8l9-m0n1-o2p3-q4r5s6t7u8v9', name: 'CWS-121 รองฝาเปิด-ปิดด้านในใหญ่', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'h5i6j7k8-l9m0-n1o2-p3q4-r5s6t7u8v9w0', name: 'CWS-121 รองฝาเปิด-ปิดด้านในเล็ก', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'i6j7k8l9-m0n1-o2p3-q4r5-s6t7u8v9w0x1', name: 'CPS-113 ฝาครอบด้านหน้า', color: 'สีขาว', salePrice: 0.97, cycleTimeSeconds: 5 },
    { id: 'j7k8l9m0-n1o2-p3q4-r5s6-t7u8v9w0x1y2', name: 'CPS-113 ฝาครอบด้านหลัง', color: 'สีขาว', salePrice: 1.02, cycleTimeSeconds: 5 },
    { id: 'k8l9m0n1-o2p3-q4r5-s6t7-u8v9w0x1y2z3', name: 'CPS-113 ชุดขาล็อคฝาครอบ', color: 'สีขาว', salePrice: 0.48, cycleTimeSeconds: 4 },
    { id: 'l9m0n1o2-p3q4-r5s6-t7u8-v9w0x1y2z3a4', name: 'ชุดขาล็อคขาเสียบสาย L', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'm0n1o2p3-q4r5-s6t7-u8v9-w0x1y2z3a4b5', name: 'ชุดขาล็อคขาเสียบสาย N', color: 'สีขาว', salePrice: 0.3, cycleTimeSeconds: 3 },
    { id: 'n1o2p3q4-r5s6-t7u8-v9w0-x1y2z3a4b5c6', name: 'ชุดขาล็อคขาเสียบสาย G', color: 'สีขาว', salePrice: 0.29, cycleTimeSeconds: 3 },
    { id: 'o2p3q4r5-s6t7-u8v9-w0x1-y2z3a4b5c6d7', name: 'CPS-116 ฝาครอบด้านหน้า', color: 'สีขาว', salePrice: 1.48, cycleTimeSeconds: 6 },
    { id: 'p3q4r5s6-t7u8-v9w0-x1y2-z3a4b5c6d7e8', name: 'CPS-116 ฝาครอบด้านหลัง', color: 'สีขาว', salePrice: 1.54, cycleTimeSeconds: 6 },
    { id: 'q4r5s6t7-u8v9-w0x1-y2z3-a4b5c6d7e8f9', name: 'CPS-116 ชุดขาล็อคฝาครอบ', color: 'สีขาว', salePrice: 0.48, cycleTimeSeconds: 4 },
    { id: 'r5s6t7u8-v9w0-x1y2-z3a4-b5c6d7e8f9g0', name: 'CPS-112 ฝาครอบด้านหน้า', color: 'สีขาว', salePrice: 0.63, cycleTimeSeconds: 4 },
    { id: 's6t7u8v9-w0x1-y2z3-a4b5-c6d7e8f9g0h1', name: 'CPS-112 ฝาครอบด้านหลัง', color: 'สีขาว', salePrice: 0.78, cycleTimeSeconds: 5 },
    { id: 't7u8v9w0-x1y2-z3a4-b5c6-d7e8f9g0h1i2', name: 'CPS-112 ชุดขาล็อคฝาครอบ', color: 'สีขาว', salePrice: 0.38, cycleTimeSeconds: 3 },
    { id: 'u8v9w0x1-y2z3-a4b5-c6d7-e8f9g0h1i2j3', name: 'ชุดล็อคขาเสียบสาย', color: 'สีขาว', salePrice: 0.35, cycleTimeSeconds: 3 },
    { id: 'v9w0x1y2-z3a4-b5c6-d7e8-f9g0h1i2j3k4', name: 'รองครอบด้านใน', color: 'สีขาว', salePrice: 0.42, cycleTimeSeconds: 4 },
    { id: 'w0x1y2z3-a4b5-c6d7-e8f9-g0h1i2j3k4l5', name: 'บล็อคฝัง 2x4', color: 'สีดำ', salePrice: 0, cycleTimeSeconds: 18 },
    { id: 'x1y2z3a4-b5c6-d7e8-f9g0-h1i2j3k4l5m6', name: 'บล็อคฝัง 4x4', color: 'สีดำ', salePrice: 0, cycleTimeSeconds: 22 },
    { id: 'y2z3a4b5-c6d7-e8f9-g0h1-i2j3k4l5m6n7', name: 'บล็อคฝัง 2x4', color: 'สีส้ม', salePrice: 0, cycleTimeSeconds: 18 },
    { id: 'z3a4b5c6-d7e8-f9g0-h1i2-j3k4l5m6n7o8', name: 'บล็อคฝัง 4x4', color: 'สีส้ม', salePrice: 0, cycleTimeSeconds: 22 },
];

const DEFAULT_RAW_MATERIALS: RawMaterial[] = [
    { id: 'a7c2b4d8-c8a7-4b68-803a-3d2b5129d5b1', name: 'กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. CT', quantity: 0, unit: 'Pcs.', costPerUnit: 14 },
    { id: 'b8d3c5e9-d9b8-4c79-814b-4e3c6230e6c2', name: 'กล่อง GN2 2นิ้วx4นิ้ว ขนาด 280x390x440 mm. G-Power', quantity: 0, unit: 'Pcs.', costPerUnit: 14 },
    { id: 'c9e4d6f0-e0c9-4d8a-825c-5f4d7341f7d3', name: 'No.2 กล่องงานห้างไม่พิมพ์ ขนาด 345 x 510 x 205 KT 125/150/125 C 3 ชั้น', quantity: 0, unit: 'Pcs.', costPerUnit: 14 },
    { id: 'd0f5e7g1-f1d0-4e9b-836d-6g5e8452g8e4', name: 'No.4 กล่องงานห้างไม่พิมพ์ ขนาด 415 x 425 x 245 KT 125/150/125 C 3 ชั้น', quantity: 0, unit: 'Pcs.', costPerUnit: 16 },
    { id: 'e1g6f8h2-g2e1-4fa-c-847e-7h6f9563h9f5', name: 'พลาสติกแพค BOX Gpower 4x4 (1 kg แพคได้ 450 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'f2h7g9i3-h3f2-4gb-d-858f-8i7g0674i0g6', name: 'พลาสติกแพค BOX Gpower 2x4 (1 kg แพคได้ 700 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'g3i8h0j4-i4g3-4hc-e-869g-9j8h1785j1h7', name: 'พลาสติกแพค BOX Gpower 4x4 ดำ (1 kg แพคได้ 450 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'h4j9i1k5-j5h4-4id-f-870h-0k9i2896k2i8', name: 'พลาสติกแพค BOX Gpower 2x4 ดำ (1 kg แพคได้ 700 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'i5k0j2l6-k6i5-4je-g-881i-1l0j3907l3j9', name: 'พลาสติกแพค ฝา Gpower 101', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'j6l1k3m7-l7j6-4kf-h-892j-2m1k4018m4k0', name: 'พลาสติกแพค ฝา Gpower 102', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'k7m2l4n8-m8k7-4lg-i-903k-3n2l5129n5l1', name: 'พลาสติกแพค ฝา Gpower 103', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'l8n3m5o9-n9l8-4mh-j-914l-4o3m6240o6m2', name: 'พลาสติกแพค ฝา Gpower 104', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'm9o4n6p0-o0m9-4ni-k-925m-5p4n7351p7n3', name: 'พลาสติกแพค ฝา Gpower 106', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'n0p5o7q1-p1n0-4oj-l-936n-6q5o8462q8o4', name: 'พลาสติกแพค ฝา Gpower 1022', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'o1q6p8r2-q2o1-4pk-m-947o-7r6p9573r9p5', name: 'พลาสติกแพค BOX CT 4x4 (1 kg แพคได้ 450 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'p2r7q9s3-r3p2-4ql-n-958p-8s7q0684s0q6', name: 'พลาสติกแพค BOX CT 2x4 (1 kg แพคได้ 700 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'q3s8r0t4-s4q3-4rm-o-969q-9t8r1795t1r7', name: 'พลาสติกแพค BOX CT 4x4 ดำ (1 kg แพคได้ 450 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'r4t9s1u5-t5r4-4sn-p-970r-0u9s2806u2s8', name: 'พลาสติกแพค BOX CT 2x4 ดำ (1 kg แพคได้ 700 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 's5u0t2v6-u6s5-4to-q-981s-1v0t3917v3t9', name: 'พลาสติกแพค ฝา CT 101 (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 't6v1u3w7-v7t6-4up-r-992t-2w1u4028w4u0', name: 'พลาสติกแพค ฝา CT 102 (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'u7w2v4x8-w8u7-4vq-s-003u-3x2v5139x5v1', name: 'พลาสติกแพค ฝา CT 103 (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'v8x3w5y9-x9v8-4wr-t-014v-4y3w6250y6w2', name: 'พลาสติกแพค ฝา CT 104 (1 kg แพคได้ 750 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'w9y4x6z0-y0w9-4xs-u-025w-5z4x7361z7x3', name: 'พลาสติกแพค ฝา CT 106 (1 kg แพคได้ 750 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'x0z5y7a1-z1x0-4yt-v-036x-6a5y8472a8y4', name: 'พลาสติกแพค ฝา CT 1022 (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'y1a6z8b2-a2y1-4zu-w-047y-7b6z9583b9z5', name: 'พลาสติกแพค ฝา CT 101B (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'z2b7a9c3-b3z2-4av-x-058z-8c7a0694c0a6', name: 'พลาสติกแพค ฝา CT 102B (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'a3c8b0d4-c4a3-4bw-y-069a-9d8b1705d1b7', name: 'พลาสติกแพค ฝา CT 103B (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'b4d9c1e5-d5b4-4cx-z-070b-0e9c2816e2c8', name: 'พลาสติกแพค ฝา CT 104B (1 kg แพคได้ 750 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'c5e0d2f6-e6c5-4dy-a-081c-1f0d3927f3d9', name: 'พลาสติกแพค ฝา CT 106B (1 kg แพคได้ 750 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'd6f1e3g7-f7d6-4ez-b-092d-2g1e4038g4e0', name: 'พลาสติกแพค ฝา CT 1022B (1 kg แพคได้ 850 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'e7g2f4h8-g8e7-4fa-c-103e-3h2f5149h5f1', name: 'พลาสติกกันรอย NEW 2 153 mm. (1 ม้วน แปะได้ 1,730 ชิ้น)', quantity: 0, unit: 'Pcs.' },
    { id: 'f8h3g5i9-h9f8-4gb-d-114f-4i3g6250i6g2', name: 'พลาสติกกันรอย NEW 4 203 mm. (1 ม้วน แปะได้ 1,730 ชิ้น)', quantity: 0, unit: 'Pcs.' },
    { id: 'g9i4h6j0-i0g9-4hc-e-125g-5j4h7361j7h3', name: 'พลาสติกกันรอย NEW 6 238 mm. (1 ม้วน แปะได้ 1,730 ชิ้น)', quantity: 0, unit: 'Pcs.' },
    { id: 'h0j5i7k1-j1h0-4id-f-136h-6k5i8472k8i4', name: 'พลาสติกกันรอย NEW 8 273 mm. (1 ม้วน แปะได้ 1,730 ชิ้น)', quantity: 0, unit: 'Pcs.' },
    { id: 'i1k6j8l2-k2i1-4je-g-147i-7l6j9583l9j5', name: 'พลาสติกกันรอย NEW 10 310 mm. (1 ม้วน แปะได้ 1,730 ชิ้น)', quantity: 0, unit: 'Pcs.' },
    { id: 'j2l7k9m3-l3j2-4kf-h-158j-8m7k0694m0k6', name: 'พลาสติกกันรอย 115 mm.', quantity: 0, unit: 'Pcs.' },
    { id: 'k3m8l0n4-m4k3-4lg-i-169k-9n8l1705n1l7', name: 'พลาสติกกันรอย 130 mm.', quantity: 0, unit: 'Pcs.' },
    { id: 'l4n9m1o5-n5l4-4mh-j-170l-0o9m2816o2m8', name: 'พลาสติกแพค BEWON 2x4 (1 kg แพคได้ 700 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'm5o0n2p6-o6m5-4ni-k-181m-1p0n3927p3n9', name: 'พลาสติกแพค BEWON 4x4 (1 kg แพคได้ 450 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'n6p1o3q7-p7n6-4oj-l-192n-2q1o4038q4o0', name: 'พลาสติกแพค BEWON 201 (1 kg แพคได้ 1,000 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'o7q2p4r8-q8o7-4pk-m-203o-3r2p5149r5p1', name: 'พลาสติกแพค BEWON 202 (1 kg แพคได้ 1,000 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'p8r3q5s9-r9p8-4ql-n-214p-4s3q6250s6q2', name: 'พลาสติกแพค BEWON 203 (1 kg แพคได้ 1,000 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'q9s4r6t0-t0q9-4rm-o-225q-5t4r7361t7r3', name: 'พลาสติกแพค BEWON 222 (1 kg แพคได้ 1,000 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 'r0t5s7u1-u1r0-4sn-p-236r-6u5s8472u8s4', name: 'พลาสติกแพค BEWON 604 (1 kg แพคได้ 855 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 's1u6t8v2-v2s1-4to-q-247s-7v6t9583v9t5', name: 'พลาสติกแพค BEWON 606 (1 kg แพคได้ 855 ชิ้น)', quantity: 0, unit: 'kg', costPerUnit: 104.4 },
    { id: 't2v7u9w3-w3t2-4up-r-258t-8w7u0694w0u6', name: 'กล่อง G-Power 101', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'u3w8v0x4-x4u3-4vq-s-269u-9x8v1705x1v7', name: 'กล่อง G-Power 102', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'v4x9w1y5-y5v4-4wr-t-270v-0y9w2816y2w8', name: 'กล่อง G-Power 103', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'w5y0x2z6-z6w5-4xs-u-281w-1z0x3927z3x9', name: 'กล่อง G-Power 103B', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'x6z1y3a7-a7x6-4yt-v-292x-2a1y4038a4y0', name: 'กล่อง G-Power 104', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'y7a2z4b8-b8y7-4zu-w-303y-3b2z5149b5z1', name: 'กล่อง G-Power 106', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'z8b3a5c9-c9z8-4av-x-314z-4c3a6250c6a2', name: 'กล่อง G-Power 1022', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'a9c4b6d0-d0a9-4bw-y-325a-5d4b7361d7b3', name: 'กล่อง CT 101', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'b0d5c7e1-e1b0-4cx-z-336b-6e5c8472e8c4', name: 'กล่อง CT 102', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'c1e6d8f2-f2c1-4dy-a-347c-7f6d9583f9d5', name: 'กล่อง CT 103', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'd2f7e9g3-g3d2-4ez-b-358d-8g7e0694g0e6', name: 'กล่อง CT 104', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'e3g8f0h4-h4e3-4fa-c-369e-9h8f1705h1f7', name: 'กล่อง CT 106', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'f4h9g1i5-i5f4-4gb-d-370f-0i9g2816i2g8', name: 'กล่อง CT 1022', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'g5i0h2j6-j6g5-4hc-e-381g-1j0h3927j3h9', name: 'กล่อง CT 101B', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'h6j1i3k7-k7h6-4id-f-392h-2k1i4038k4i0', name: 'กล่อง CT 102B', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'i7k2j4l8-l8i7-4je-g-403i-3l2j5149l5j1', name: 'กล่อง CT 103B', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'j8l3k5m9-m9j8-4kf-h-414j-4m3k6250m6k2', name: 'กล่อง CT 104B', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'k9m4l6n0-n0k9-4lg-i-425k-5n4l7361n7l3', name: 'กล่อง CT 106B', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'l0n5m7o1-o1l0-4mh-j-436l-6o5m8472o8m4', name: 'กล่อง CT 1022B', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'm1o6n8p2-p2m1-4ni-k-447m-7p6n9583p9n5', name: 'กล่อง BEWON 201', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'n2p7o9q3-q3n2-4oj-l-458n-8q7o0694q0o6', name: 'กล่อง BEWON 202', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'o3q8p0r4-r4o3-4pk-m-469o-9r8p1705r1p7', name: 'กล่อง BEWON 222', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'p4r9q1s5-s5p4-4ql-n-470p-0s9q2816s2q8', name: 'กล่อง BEWON 203', quantity: 0, unit: 'Pcs.', costPerUnit: 2.57 },
    { id: 'q5s0r2t6-t6q5-4rm-o-481q-1t0r3927t3r9', name: 'กล่อง BEWON 604', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'r6t1s3u7-u7r6-4sn-p-492r-2u1s4038u4s0', name: 'กล่อง BEWON 606', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 's7u2t4v8-v8s7-4to-q-503s-3v2t5149v5t1', name: 'ลัง CT 101-1022', quantity: 0, unit: 'Pcs.', costPerUnit: 13 },
    { id: 't8v3u5w9-w9t8-4up-r-514t-4w3u6250w6u2', name: 'ลัง CT 104-106', quantity: 0, unit: 'Pcs.', costPerUnit: 16 },
    { id: 'u9w4v6x0-x0u9-4vq-s-525u-5x4v7361x7v3', name: 'ลัง Gpower 101-1022', quantity: 0, unit: 'Pcs.', costPerUnit: 13 },
    { id: 'v0x5w7y1-y1v0-4wr-t-536v-6y5w8472y8w4', name: 'ลัง Gpower 104-106', quantity: 0, unit: 'Pcs.', costPerUnit: 16 },
    { id: 'w1y6x8z2-z2w1-4xs-u-547w-7z6x9583z9x5', name: 'ลัง CT 2x4', quantity: 0, unit: 'Pcs.', costPerUnit: 14 },
    { id: 'x2z7y9a3-a3x2-4yt-v-558x-8a7y0694a0y6', name: 'ลัง CT 4x4', quantity: 0, unit: 'Pcs.', costPerUnit: 16 },
    { id: 'y3a8z0b4-b4y3-4zu-w-569y-9b8z1705b1z7', name: 'ลัง Gpower 2x4', quantity: 0, unit: 'Pcs.', costPerUnit: 14 },
    { id: 'z4b9a1c5-c5z4-4av-x-570z-0c9a2816c2a8', name: 'ลัง Gpower 4x4', quantity: 0, unit: 'Pcs.', costPerUnit: 20 },
    { id: 'a5c0b2d6-d6a5-4bw-y-581a-1d0b3927d3b9', name: 'ลัง BEWON 201', quantity: 0, unit: 'Pcs.', costPerUnit: 13 },
    { id: 'b6d1c3e7-e7b6-4cx-z-592b-2e1c4038e4c0', name: 'ลัง BEWON 202', quantity: 0, unit: 'Pcs.', costPerUnit: 13 },
    { id: 'c7e2d4f8-f8c7-4dy-a-603c-3f2d5149f5d1', name: 'ลัง BEWON 222', quantity: 0, unit: 'Pcs.', costPerUnit: 13 },
    { id: 'd8f3e5g9-g9d8-4ez-b-614d-4g3e6250g6e2', name: 'ลัง BEWON 203', quantity: 0, unit: 'Pcs.', costPerUnit: 13 },
    { id: 'e9g4f6h0-h0e9-4fa-c-625e-5h4f7361h7f3', name: 'ลัง BEWON 604', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'f0h5g7i1-i1f0-4gb-d-636f-6i5g8472i8g4', name: 'ลัง BEWON 606', quantity: 0, unit: 'Pcs.', costPerUnit: 3.06 },
    { id: 'g1i6h8j2-j2g1-4hc-e-647g-7j6h9583j9h5', name: 'ลัง BEWON 2x4', quantity: 0, unit: 'Pcs.', costPerUnit: 14 },
    { id: 'h2j7i9k3-k3h2-4id-f-658h-8k7i0694k0i6', name: 'ลัง BEWON 4x4', quantity: 0, unit: 'Pcs.', costPerUnit: 16 },
    { id: 'i3k8j0l4-l4i3-4je-g-669i-9l8j1705l1j7', name: 'เม็ด ABS WHITE 401 WH-4815-9220', quantity: 0, unit: 'kg', costPerUnit: 43.5 },
    { id: 'j4l9k1m5-m5j4-4kf-h-670j-0m9k2816m2k8', name: 'เม็ด ABS ฝาใหญ่ 9421', quantity: 0, unit: 'kg', costPerUnit: 47.5 },
    { id: 'k5m0l2n6-n6k5-4lg-i-681k-1n0l3927n3l9', name: 'เม็ด ABS ดำ', quantity: 0, unit: 'kg', costPerUnit: 33.5 },
    { id: 'l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0', name: 'เม็ด PC ใส BP15', quantity: 0, unit: 'kg', costPerUnit: 56 },
    { id: 'm7o2n4p8-p8m7-4ni-k-703m-3p2n5149p5n1', name: 'เม็ด PC ใสเทา', quantity: 0, unit: 'kg' },
    { id: 'n8p3o5q9-q9n8-4oj-l-714n-4q3o6250q6o2', name: 'เม็ด PC ขาวฝาใหญ่ 9410', quantity: 0, unit: 'kg', costPerUnit: 60 },
    { id: 'o9q4p6r0-r0o9-4pk-m-725o-5r4p7361r7p3', name: 'เม็ด PC ขาวอะไหล่ 9209', quantity: 0, unit: 'kg', costPerUnit: 60 },
    { id: 'p0r5q7s1-s1p0-4ql-n-736p-6s5q8472s8q4', name: 'เม็ด PC ดำ', quantity: 0, unit: 'kg' },
    { id: 'q1s6r8t2-t2q1-4rm-o-747q-7t6r9583t9r5', name: 'เม็ด PC เขียว', quantity: 0, unit: 'kg' },
    { id: 'r2t7s9u3-u3r2-4sn-p-758r-8u7s0694u0s6', name: 'เม็ด PC ครีม', quantity: 0, unit: 'kg' },
    { id: 's3u8t0v4-v4s3-4to-q-769s-9v8t1705v1t7', name: 'เม็ด HIPS WHITE บล็อกลอย 9206', quantity: 0, unit: 'kg', costPerUnit: 43.5 },
    { id: 't4v9u1w5-w5t4-4up-r-770t-0w9u2816w2u8', name: 'เม็ด HIPS ดำ', quantity: 0, unit: 'kg', costPerUnit: 30.1 },
    { id: 'u5w0v2x6-x6u5-4vq-s-781u-1x0v3927x3v9', name: 'เม็ด POM', quantity: 0, unit: 'kg', costPerUnit: 100 },
    { id: 'v6x1w3y7-y7v6-4wr-t-792v-2y1w4038y4w0', name: 'เม็ด POM เหลือง', quantity: 0, unit: 'kg' },
    { id: 'w7y2x4z8-z8w7-4xs-u-803w-3z2x5149z5x1', name: 'เม็ดพุก', quantity: 0, unit: 'kg' },
    { id: 'x8z3y5a9-a9x8-4yt-v-814x-4a3y6250a6y2', name: 'สกรู P# 7x1"', quantity: 0, unit: 'Pcs.', costPerUnit: 0.08 },
    { id: 'y9a4z6b0-b0y9-4zu-w-825y-5b4z7361b7z3', name: 'สกรู P# 7x1/2"', quantity: 0, unit: 'Pcs.', costPerUnit: 0.06 },
    { id: 'z0b5a7c1-c1z0-4av-x-836z-6c5a8472c8a4', name: 'พุก', quantity: 0, unit: 'Pcs.', costPerUnit: 0.03 },
    { id: 'a1c6b8d2-d2a1-4bw-y-847a-7d6b9583d9b5', name: 'พลาสติกแพคน็อต', quantity: 0, unit: 'kg', costPerUnit: 83.3 },
    { id: 'b2d7c9e3-e3b2-4cx-z-858b-8e7c0694e0c6', name: 'สติกเกอร์บาร์โค้ด', quantity: 0, unit: 'ชิ้น', costPerUnit: 0.03 },
    { id: 'c3e8d0f4-f4c3-4dy-a-869c-9f8d1705f1d7', name: 'เม็ด PC ดำบด', quantity: 0, unit: 'kg' },
    { id: 'd4f9e1g5-g5d4-4ez-b-870d-0g9e2816g2e8', name: 'เม็ด PC ขาวบด', quantity: 0, unit: 'kg' },
    { id: 'e5g0f2h6-h6e5-4fa-c-881e-1h0f3927h3f9', name: 'เม็ด HIPS WHITE', quantity: 0, unit: 'kg', costPerUnit: 43.5 },
    { id: 'f6h1g3i7-i7f6-4gb-d-892f-2i1g4038i4g0', name: 'เม็ด PC ใส จีน', quantity: 0, unit: 'kg', costPerUnit: 54 },
    { id: 'g7i2h4j8-j8g7-4hc-e-903g-3j2h5149j5h1', name: 'ม้วนฟิล์มหด PVC หนา 60-70 ไมครอน หน้ากว้าง 12 นิ้ว', quantity: 0, unit: 'kg', costPerUnit: 94.12 },
    { id: 'h8j3i5k9-k9h8-4id-f-914h-4k3i6250k6i2', name: 'กล่องCTM-R4/CTM-C6 ขนาด300x480x475 mm. KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 23.5 },
    { id: 'i9k4j6l0-l0i9-4je-g-925i-5l4j7361l7j3', name: 'กล่องCTM-C8/CTM-R6 ขนาด342x355x485 mm.KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 23 },
    { id: 'j0l5k7m1-m1j0-4kf-h-936j-6m5k8472m8k4', name: 'กล่องCTM-R10 ขนาด425x465x245 mm. KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 23 },
    { id: 'k1m6l8n2-n2k1-4lg-i-947k-7n6l9583n9l5', name: 'สีผงขาว PC จากจีน', quantity: 0, unit: 'kg', costPerUnit: 0 },
    { id: 'l2n7m9o3-o3l2-4mh-j-958l-8o7m0694o0m6', name: 'เม็ด HDPE ดำ 21', quantity: 0, unit: 'kg', costPerUnit: 21 },
    { id: 'm3o8n0p4-p4m3-4ni-k-969m-9p8n1705p1n7', name: 'HDPE ดำ 20', quantity: 0, unit: 'kg', costPerUnit: 20 },
    { id: 'n4p9o1q5-q5n4-4oj-l-970n-0q9o2816q2o8', name: 'กล่อง CBJF/G 001 295 x 250 x 370 KT125/125/105/125/105 BC', quantity: 0, unit: 'Pcs.', costPerUnit: 16.85 },
    { id: 'o5q0p2r6-r6o5-4pk-m-981o-1r0p3927r3p9', name: 'กล่อง CBJF/G 002 315 x 250 x 470 KT125/125/105/125/105 BC', quantity: 0, unit: 'Pcs.', costPerUnit: 21.7 },
    { id: 'p6r1q3s7-s7p6-4ql-n-992p-2s1q4038s4q0', name: 'กล่อง CBJF/G 003 365 x 250 x 470 KT125/125/105/125/105 BC', quantity: 0, unit: 'Pcs.', costPerUnit: 21.7 },
    { id: 'q7s2r4t8-t8q7-4rm-o-003q-3t2r5149t5r1', name: 'กล่อง CBJA/B 001 295 x 200 x 370 KT125/125/105/125/105 BC', quantity: 0, unit: 'Pcs.', costPerUnit: 15.5 },
    { id: 'r8t3s5u9-u9r8-4sn-p-014r-4u3s6250u6s2', name: 'กล่อง CBJA/B 002 315 x 200 x 470 KT125/125/105/125/105 BC', quantity: 0, unit: 'Pcs.', costPerUnit: 18.75 },
    { id: 's9u4t6v0-v0s9-4to-q-025s-5v4t7361v7t3', name: 'กล่อง CBJA/B 003 365 x 200 x 470 KT125/125/105/125/105 BC', quantity: 0, unit: 'Pcs.', costPerUnit: 18.75 },
    { id: 't0v5u7w1-w1t0-4up-r-036t-6w5u8472w8u4', name: 'เม็ด ABS WHITE CODE 131312', quantity: 0, unit: 'kg', costPerUnit: 46 },
    { id: 'u1w6v8x2-x2u1-4vq-s-047u-7x6v9583x9v5', name: 'แผ่นทองแดง หนา 1.7มม. กว้าง 152มม. ยาว 1,500+-มม.', quantity: 0, unit: 'kg', costPerUnit: 100 },
    { id: 'v2x7w9y3-y3v2-4wr-t-058v-8y7w0694y0w6', name: 'พลาสติกแพคน็อต OPP HS 120mm.*1500m.*40mic', quantity: 0, unit: 'kg', costPerUnit: 95 },
    { id: 'w3y8x0z4-z4w3-4xs-u-069w-9z8x1705z1x7', name: 'กล่อง CTBN/W-2 37.5 x 19 x 54 cm. KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 18.75 },
    { id: 'x4z9y1a5-a5x4-4yt-v-070x-0a9y2816a2y8', name: 'กล่อง CT A101-1022 29.5x27.5x38 cm. KT125/150/125 C W/B', quantity: 0, unit: 'Pcs.', costPerUnit: 18.75 },
    { id: 'y5a0z2b6-b6y5-4zu-w-081y-1b0z3927b3z9', name: 'กล่อง CTBN4 46 x 24 x 62 cm. KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 30 },
    { id: 'z6b1a3c7-c7z6-4av-x-092z-2c1a4038c4a0', name: 'กล่อง CTBN5 59x 26 x 71 cm. KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 41 },
    { id: 'a7c2b4d8-d8a7-4bw-y-103a-3d2b5149d5b1', name: 'กล่อง CTBN6 61 x 26 x 78 cm. KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 44 },
    { id: 'b8d3c5e9-e9b8-4cx-z-114b-4e3c6250e6c2', name: 'กล่อง CT-24 38 x 14 x 65 cm. KT125/125/105/125/105', quantity: 0, unit: 'Pcs.', costPerUnit: 28 },
    { id: 'c9e4d6f0-f0c9-4dy-a-125c-5f4d7361f7d3', name: 'เม็ด PP สีดำ', quantity: 0, unit: 'kg', costPerUnit: 15 },
];

const DEFAULT_ROLES: AppRole[] = [
    { id: 'role_manager', name: 'ผู้จัดการโรงงาน' },
    { id: 'role_sales', name: 'ฝ่ายขาย' },
    { id: 'role_production', name: 'ฝ่ายผลิต' },
];

const DEFAULT_DASHBOARD_LAYOUTS: Record<string, string[]> = {
    [DEFAULT_ROLES[0].id]: ['aiPlanner', 'aiInventoryForecast', 'upcomingOrders', 'pendingQc', 'lowStock', 'productionSummary', 'topPackers', 'rawMaterialNeeds'],
    [DEFAULT_ROLES[1].id]: ['upcomingOrders', 'lowStock', 'productionSummary'],
    [DEFAULT_ROLES[2].id]: ['aiPlanner', 'pendingQc', 'rawMaterialNeeds', 'productionSummary'],
};

// Generic getter
const getItems = <T,>(key: string): T[] => {
    try {
        const itemsJson = localStorage.getItem(key);
        return itemsJson ? JSON.parse(itemsJson) : [];
    } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return [];
    }
};

// Generic setter
const saveItems = <T,>(key: string, items: T[]): void => {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
};

// Order specific functions
export const getOrders = (): OrderItem[] => getItems<OrderItem>(ORDERS_KEY);
export const saveOrders = (orders: OrderItem[]): void => saveItems<OrderItem>(ORDERS_KEY, orders);

// Packing Log specific functions
export const getPackingLogs = (): PackingLogEntry[] => getItems<PackingLogEntry>(LOGS_KEY);
export const savePackingLogs = (logs: PackingLogEntry[]): void => saveItems<PackingLogEntry>(LOGS_KEY, logs);

// Molding Log specific functions
export const getMoldingLogs = (): MoldingLogEntry[] => getItems<MoldingLogEntry>(MOLDING_LOGS_KEY);
export const saveMoldingLogs = (logs: MoldingLogEntry[]): void => saveItems<MoldingLogEntry>(MOLDING_LOGS_KEY, logs);

// Inventory specific functions
export const getInventory = (): InventoryItem[] => getItems<InventoryItem>(INVENTORY_KEY);
export const saveInventory = (inventory: InventoryItem[]): void => saveItems<InventoryItem>(INVENTORY_KEY, inventory);

// Product specific functions
export const getProducts = (): Product[] => {
    const items = getItems<Product>(PRODUCTS_KEY);
    if (items.length === 0) {
        saveProducts(DEFAULT_PRODUCTS);
        return [...DEFAULT_PRODUCTS].sort((a, b) => a.name.localeCompare(b.name));
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
};
export const saveProducts = (products: Product[]): void => saveItems<Product>(PRODUCTS_KEY, products);


// Employee specific functions
export const getEmployees = (): Employee[] => {
    const items = getItems<Employee>(EMPLOYEES_KEY);
    return items.sort((a,b) => a.name.localeCompare(b.name));
};
export const saveEmployees = (employees: Employee[]): void => saveItems<Employee>(EMPLOYEES_KEY, employees);

// QC Entry specific functions
export const getQCEntries = (): QCEntry[] => getItems<QCEntry>(QC_KEY);
export const saveQCEntries = (entries: QCEntry[]): void => saveItems<QCEntry>(QC_KEY, entries);

// Raw Material specific functions
export const getRawMaterials = (): RawMaterial[] => {
    const items = getItems<RawMaterial>(RAW_MATERIALS_KEY);
    if (items.length === 0) {
        saveRawMaterials(DEFAULT_RAW_MATERIALS);
        return [...DEFAULT_RAW_MATERIALS].sort((a, b) => a.name.localeCompare(b.name));
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
};
export const saveRawMaterials = (materials: RawMaterial[]): void => saveItems<RawMaterial>(RAW_MATERIALS_KEY, materials);

// Bill of Material (BOM) specific functions
export const getBOMs = (): BillOfMaterial[] => {
    const items = getItems<BillOfMaterial>(BOMS_KEY);
    return items;
};
export const saveBOMs = (boms: BillOfMaterial[]): void => saveItems<BillOfMaterial>(BOMS_KEY, boms);

// Machine specific functions
export const getMachines = (): Machine[] => {
    const items = getItems<Machine>(MACHINES_KEY);
    return items;
};
export const saveMachines = (machines: Machine[]): void => saveItems<Machine>(MACHINES_KEY, machines);

// Maintenance Log specific functions
export const getMaintenanceLogs = (): MaintenanceLog[] => getItems<MaintenanceLog>(MAINTENANCE_LOGS_KEY);
export const saveMaintenanceLogs = (logs: MaintenanceLog[]): void => saveItems<MaintenanceLog>(MAINTENANCE_LOGS_KEY, logs);

// Supplier specific functions
export const getSuppliers = (): Supplier[] => {
    const items = getItems<Supplier>(SUPPLIERS_KEY);
    return items;
};
export const saveSuppliers = (suppliers: Supplier[]): void => saveItems<Supplier>(SUPPLIERS_KEY, suppliers);

// Purchase Order specific functions
export const getPurchaseOrders = (): PurchaseOrder[] => getItems<PurchaseOrder>(PURCHASE_ORDERS_KEY);
export const savePurchaseOrders = (pos: PurchaseOrder[]): void => saveItems<PurchaseOrder>(PURCHASE_ORDERS_KEY, pos);

// Shipment specific functions
export const getShipments = (): Shipment[] => getItems<Shipment>(SHIPMENTS_KEY);
export const saveShipments = (shipments: Shipment[]): void => saveItems<Shipment>(SHIPMENTS_KEY, shipments);

// Customer specific functions
export const getCustomers = (): Customer[] => getItems<Customer>(CUSTOMERS_KEY);
export const saveCustomers = (customers: Customer[]): void => saveItems<Customer>(CUSTOMERS_KEY, customers);

// Complaint specific functions
export const getComplaints = (): Complaint[] => getItems<Complaint>(COMPLAINTS_KEY);
export const saveComplaints = (complaints: Complaint[]): void => saveItems<Complaint>(COMPLAINTS_KEY, complaints);

// App Settings specific functions
const DEFAULT_SETTINGS: AppSettings = {
    companyInfo: {
        name: 'CT.ELECTRIC',
        address: '123 ถนนสุขุมวิท แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260',
        taxId: '0105558000111',
        logoUrl: CTElectricLogo,
        currentUserRoleId: DEFAULT_ROLES[0].id,
    },
    qcFailureReasons: [
        'สินค้าชำรุด',
        'แพ็คเกจไม่สวยงาม',
        'จำนวนผิดพลาด',
        'ปิดผนึกไม่ดี',
        'ติดฉลากผิด',
        'อื่นๆ',
    ],
    productionStatuses: [
        'รอแปะกันรอย',
        'รอประกบ',
        'ห้องประกอบ',
        'ห้องแพ็ค',
    ],
    roles: DEFAULT_ROLES,
    dashboardLayouts: DEFAULT_DASHBOARD_LAYOUTS,
};

export const getSettings = (): AppSettings => {
    const settingsJson = localStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
        try {
            const stored = JSON.parse(settingsJson);
            
            // Ensure roles and layouts are properly merged with defaults
            const roles = stored.roles || DEFAULT_SETTINGS.roles;
            const layouts = stored.dashboardLayouts || {};
            const finalLayouts = { ...DEFAULT_SETTINGS.dashboardLayouts, ...layouts };

            // Ensure every role has a default layout if it's missing
            roles.forEach((role: AppRole) => {
                if (!finalLayouts[role.id]) {
                    finalLayouts[role.id] = DEFAULT_SETTINGS.dashboardLayouts[DEFAULT_SETTINGS.roles[0].id] || [];
                }
            });

            return {
                ...DEFAULT_SETTINGS,
                ...stored,
                companyInfo: {
                    ...DEFAULT_SETTINGS.companyInfo,
                    ...(stored.companyInfo || {}),
                },
                qcFailureReasons: stored.qcFailureReasons || DEFAULT_SETTINGS.qcFailureReasons,
                productionStatuses: stored.productionStatuses || DEFAULT_SETTINGS.productionStatuses,
                roles: roles,
                dashboardLayouts: finalLayouts,
            };
        } catch(e) {
             console.error("Could not parse settings from localStorage", e);
             return DEFAULT_SETTINGS;
        }
    }
    return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings): void => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("Could not save settings to localStorage", e);
    }
};


// Helper function for procurement, re-using analysis logic
export const getAnalysisShortfall = (): { id: string; name: string; unit: string; shortfall: number }[] => {
    const orders = getOrders();
    const boms = getBOMs();
    const rawMaterials = getRawMaterials();

    const bomMap = new Map(boms.map(b => [b.productName, b]));
    const rawMaterialMap = new Map(rawMaterials.map(rm => [rm.id, rm]));
    const requiredMaterials = new Map<string, { required: number, name: string, unit: string }>();

    orders.forEach(order => {
        const productName = `${order.name} (${order.color})`;
        const bom = bomMap.get(productName);
        if (bom) {
            bom.components.forEach(comp => {
                const material = rawMaterialMap.get(comp.rawMaterialId);
                if (material) {
                    const totalRequired = comp.quantity * order.quantity; // Assuming order.quantity is number of cases and BOM is per case
                    const existing = requiredMaterials.get(material.id) || { required: 0, name: material.name, unit: material.unit };
                    existing.required += totalRequired;
                    requiredMaterials.set(material.id, existing);
                }
            });
        }
    });
    
    const summary = Array.from(requiredMaterials.entries()).map(([id, data]) => {
        const materialInStock = rawMaterialMap.get(id);
        const inStock = materialInStock?.quantity || 0;
        const shortfall = data.required - inStock;
        return {
            ...data,
            id,
            inStock,
            shortfall: shortfall > 0 ? shortfall : 0,
        };
    });

    return summary.filter(item => item.shortfall > 0).map(item => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        shortfall: item.shortfall,
    }));
};

// Functions for notifications
export const getReadNotificationIds = (): Set<string> => {
    const idsJson = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    return idsJson ? new Set(JSON.parse(idsJson)) : new Set();
};

export const saveReadNotificationIds = (ids: Set<string>): void => {
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(Array.from(ids)));
};
