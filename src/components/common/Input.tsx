import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  error?: string | null;
  required?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  clearButton?: boolean;
  ocrSuggestion?: string | null;
  onApplyOcrSuggestion?: (value: string) => void;
  translateSuggestion?: string | null;
  onApplyTranslateSuggestion?: (value: string) => void;
  onTranslatePress?: () => void;
  isTranslating?: boolean;
}

export function Input({
  label,
  helperText,
  error,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  clearButton = false,
  ocrSuggestion,
  onApplyOcrSuggestion,
  translateSuggestion,
  onApplyTranslateSuggestion,
  onTranslatePress,
  isTranslating = false,
  value,
  onChangeText,
  style,
  multiline,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <View style={styles.labelRowLeft}>
            <Text style={styles.label}>{label}</Text>
            {required && <Text style={styles.requiredStar}> *</Text>}
          </View>
          {onTranslatePress && (
            <TouchableOpacity
              onPress={onTranslatePress}
              disabled={isTranslating}
              style={styles.translateActionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="language" size={13} color={Colors.primary} />
              <Text style={styles.translateActionText}>
                {isTranslating ? 'Translating...' : 'Translate বাংলা ➔ EN'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          multiline ? styles.multilineContainer : null,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? Colors.danger : isFocused ? Colors.primary : Colors.textMuted}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          style={[
            styles.textInput,
            multiline && styles.multilineTextInput,
            style,
          ]}
          {...rest}
        />

        {clearButton && value ? (
          <TouchableOpacity
            onPress={() => onChangeText?.('')}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={error ? Colors.danger : isFocused ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick OCR Suggestion Pill */}
      {Boolean(ocrSuggestion && ocrSuggestion.trim() && value?.trim() !== ocrSuggestion.trim()) && (
        <TouchableOpacity
          style={styles.ocrChip}
          onPress={() => {
            if (onApplyOcrSuggestion) {
              onApplyOcrSuggestion(ocrSuggestion!.trim());
            } else if (onChangeText) {
              onChangeText(ocrSuggestion!.trim());
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={13} color={Colors.primary} />
          <Text style={styles.ocrChipLabel}>OCR Detected:</Text>
          <Text style={styles.ocrChipValue} numberOfLines={1}>{ocrSuggestion}</Text>
          <View style={styles.ocrChipActionBadge}>
            <Text style={styles.ocrChipActionText}>+ Fill</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Translation Suggestion Pill */}
      {Boolean(
        translateSuggestion &&
          translateSuggestion.trim() &&
          value?.trim() !== translateSuggestion.trim()
      ) && (
        <TouchableOpacity
          style={styles.translateChip}
          onPress={() => {
            if (onApplyTranslateSuggestion) {
              onApplyTranslateSuggestion(translateSuggestion!.trim());
            } else if (onChangeText) {
              onChangeText(translateSuggestion!.trim());
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="language" size={13} color="#2563EB" />
          <Text style={styles.translateChipLabel}>From বাংলা:</Text>
          <Text style={styles.translateChipValue} numberOfLines={1}>
            {translateSuggestion}
          </Text>
          <View style={styles.translateChipActionBadge}>
            <Text style={styles.translateChipActionText}>+ Fill</Text>
          </View>
        </TouchableOpacity>
      )}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  translateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: 6,
  },
  translateActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  ocrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 6,
    gap: 6,
  },
  ocrChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  ocrChipValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  ocrChipActionBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ocrChipActionText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  translateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 6,
    gap: 6,
  },
  translateChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  translateChipValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  translateChipActionBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  translateChipActionText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  requiredStar: {
    color: Colors.danger,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    minHeight: 90,
    paddingVertical: 10,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDFA',
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: '#FEF2F2',
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 6,
  },
  multilineTextInput: {
    textAlignVertical: 'top',
    height: 80,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});

