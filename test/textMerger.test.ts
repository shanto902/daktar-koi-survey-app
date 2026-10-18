import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanOcrLine, mergeOcrLines, appendOcrText } from '../src/utils/textMerger';

test('cleanOcrLine removes leading bullets, dashes, and trailing commas', () => {
  assert.equal(cleanOcrLine('• MBBS (DMC), BCS (Health),'), 'MBBS (DMC), BCS (Health)');
  assert.equal(cleanOcrLine('- FCPS (Medicine);'), 'FCPS (Medicine)');
  assert.equal(cleanOcrLine('1. MD (Cardiology)'), 'MD (Cardiology)');
  assert.equal(cleanOcrLine('  ► Senior Consultant '), 'Senior Consultant');
});

test('mergeOcrLines merges 2 or 3 qualification lines in natural reading order', () => {
  const ocrLines = [
    'Prof. Dr. M. A. Rahman',
    '• MBBS (DMC), BCS (Health)',
    '- FCPS (Medicine), MD (Cardiology)',
    'FACP (USA), Fellow WHO',
    'Chamber: Dhanmondi, Dhaka',
  ];

  // Select lines 1, 2, 3 (0-indexed) in out-of-order sequence [3, 1, 2]
  const merged = mergeOcrLines(ocrLines, [3, 1, 2], ', ');

  assert.equal(
    merged,
    'MBBS (DMC), BCS (Health), FCPS (Medicine), MD (Cardiology), FACP (USA), Fellow WHO'
  );
});

test('mergeOcrLines with newline delimiter for address lines', () => {
  const ocrLines = [
    'Room 304, 3rd Floor',
    'Central Hospital Ltd.',
    'House 2, Road 5, Green Road, Dhaka',
  ];

  const mergedAddress = mergeOcrLines(ocrLines, [0, 1, 2], '\n');

  assert.equal(
    mergedAddress,
    'Room 304, 3rd Floor\nCentral Hospital Ltd.\nHouse 2, Road 5, Green Road, Dhaka'
  );
});

test('appendOcrText cleanly joins without double commas', () => {
  const existing = 'MBBS (Dhaka), BCS (Health),';
  const addition = '• FCPS (Medicine)';

  const result = appendOcrText(existing, addition, ', ');
  assert.equal(result, 'MBBS (Dhaka), BCS (Health), FCPS (Medicine)');

  const resultEmpty = appendOcrText('', addition, ', ');
  assert.equal(resultEmpty, 'FCPS (Medicine)');
});

