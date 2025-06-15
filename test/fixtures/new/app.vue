<script setup lang="ts">
const msg = checkNuxtVersion('>=3.5.0') ? '__PASS__' : '__FAIL__'
</script>

<template>
  {{ msg }}
</template>
