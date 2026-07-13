<script setup lang="ts">
import { getAccountIconUrl } from './account/config';

const props = defineProps<{ icon?: string }>();
</script>

<template>
  <img v-if="icon" :src="getAccountIconUrl(icon)" class="w-5 h-5 rounded shrink-0" alt="" />
</template>
