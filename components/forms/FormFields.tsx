"use client";
import { Controller, FieldValues } from "react-hook-form";
import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { FormFieldProps, FormSelectProps, FormSliderProps, FormSwitchProps, FormRadioGroupProps } from "@/types/index";

const allowedInputModes = [
  "none",
  "text",
  "tel",
  "url",
  "email",
  "numeric",
  "decimal",
  "search",
] as const;
type AllowedInputMode = (typeof allowedInputModes)[number];

const CustomFormField = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  inputMode,
  step,
  min,
  max,
  pattern,
  description,
  className,
  textareaClassName,
  rows = 3,
}: FormFieldProps<T> & {
  type?: "text" | "email" | "password" | "textarea" | "number" | "url";
  inputMode?: AllowedInputMode;
  step?: number | string;
  min?: number | string;
  max?: number | string;
  pattern?: string;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const isNumberField = (type as string) === "number";

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="label">{label}</FormLabel>
          <FormControl>
            {type === "textarea" ? (
              <Textarea
                className={`input ${textareaClassName || ""}`}
                placeholder={placeholder}
                rows={rows}
                {...field}
              />
            ) : (
              <div className="relative">
                <Input
                  className="input"
                  type={
                    isPasswordField
                      ? showPassword
                        ? "text"
                        : "password"
                      : isNumberField
                        ? "number"
                        : type
                  }
                  placeholder={placeholder}
                  {...(inputMode && allowedInputModes.includes(inputMode)
                    ? { inputMode }
                    : {})}
                  step={step}
                  min={min}
                  max={max}
                  pattern={pattern}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    if (isNumberField) {
                      const val = e.target.value;
                      field.onChange(val === "" ? "" : Number(val));
                    } else {
                      field.onChange(e.target.value);
                    }
                  }}
                />
                {isPasswordField && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                )}
              </div>
            )}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const CustomFormSelect = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  options,
  className,
  disabled = false,
}: FormSelectProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value || ""}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const CustomFormSlider = <T extends FieldValues>({
  control,
  name,
  label,
  description,
  min,
  max,
  step,
  className,
  formatValue,
}: FormSliderProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}: {formatValue ? formatValue(field.value) : field.value}
          </FormLabel>
          <FormControl>
            <Slider
              min={min}
              max={max}
              step={step}
              value={[field.value || 0]}
              onValueChange={(value) => field.onChange(value[0])}
              className="w-full"
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const CustomFormSwitch = <T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: FormSwitchProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={`flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm ${
            className || ""
          }`}
        >
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={field.value || false}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

const CustomFormRadioGroup = <T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  className,
}: FormRadioGroupProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`space-y-3 ${className || ""}`}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value || ""}
              className="flex flex-col space-y-2"
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.id} />
                  <label
                    htmlFor={option.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export {
  CustomFormField,
  CustomFormSelect,
  CustomFormSlider,
  CustomFormSwitch,
  CustomFormRadioGroup,
};
