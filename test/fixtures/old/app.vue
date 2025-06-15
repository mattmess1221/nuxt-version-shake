<script setup lang="ts">
const msg = checkNuxtVersion('<3.0.0') ? '__PASS__' : '__FAIL__'
</script>

<template>
  {{ msg }}
</template>
