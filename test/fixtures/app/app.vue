<script setup lang="ts">
import { checkNuxtVersion } from '#version-shake'

const msg = checkNuxtVersion('>=3.5.0') ? '__PASS__' : '__FAIL__'
</script>

<template>
  {{ msg }}
</template>
