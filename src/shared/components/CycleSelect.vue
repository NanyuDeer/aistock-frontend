<template>
  <el-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    size="small"
    class="cycle-select"
    :style="{ '--cycle-bg': currentColor }"
    popper-class="cycle-select-popper"
  >
    <el-option
      v-for="opt in options"
      :key="opt.value"
      :label="opt.label"
      :value="opt.value"
    >
      <span :style="{ color: opt.color, fontWeight: opt.value === modelValue ? '700' : '400' }">{{ opt.label }}</span>
    </el-option>
  </el-select>
</template>

<script>
import { computed } from 'vue';

const CYCLE_COLORS = {
  default: '#9ca3af',
  short: '#ef4444',
  mid: '#3b82f6',
  long: '#10b981'
};

export default {
  name: 'CycleSelect',
  props: {
    modelValue: {
      type: String,
      default: 'default'
    }
  },
  emits: ['update:modelValue'],
  setup(props) {
    const options = [
      { value: 'default', label: '默认', color: CYCLE_COLORS.default },
      { value: 'short', label: '短线', color: CYCLE_COLORS.short },
      { value: 'mid', label: '中线', color: CYCLE_COLORS.mid },
      { value: 'long', label: '长线', color: CYCLE_COLORS.long }
    ];

    const currentColor = computed(() => CYCLE_COLORS[props.modelValue] || CYCLE_COLORS.default);

    return { options, currentColor };
  }
};
</script>

<style lang="scss">
.cycle-select {
  width: 80px;
  flex-shrink: 0;

  &.el-select {
    --el-fill-color-blank: var(--cycle-bg);
    --el-text-color-regular: #fff;
    --el-select-input-color: #fff;
    --el-input-text-color: #fff;
  }

  :deep(.el-input__wrapper) {
    background-color: var(--cycle-bg) !important;
    border-radius: 4px !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 8px !important;
  }

  :deep(.el-input__inner) {
    color: #fff !important;
    font-size: 12px !important;
    font-weight: 500 !important;
  }

  :deep(.el-select__caret) {
    color: rgba(255, 255, 255, 0.7) !important;
  }

  :deep(.el-select__placeholder) {
    color: #fff !important;
  }

  :deep(.el-select__selected-item) {
    color: #fff !important;
  }

  :deep(.el-input.is-focus .el-input__wrapper) {
    box-shadow: none !important;
  }
}

.cycle-select-popper {
  .el-select-dropdown__item.is-selected {
    font-weight: 700;
  }
}
</style>
