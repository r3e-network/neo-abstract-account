<template>
  <div class="bg-slate-50 relative min-h-screen">
    <div class="relative overflow-hidden">
      <!-- Background Gradients and Orbs -->
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neo-300/30 rounded-full blur-[120px] mix-blend-multiply animate-pulse-slow"></div>
        <div class="absolute top-[20%] right-[-5%] w-[35%] h-[35%] bg-blue-300/30 rounded-full blur-[120px] mix-blend-multiply animate-pulse-slow" style="animation-delay: 1s;"></div>
        <div class="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-teal-300/20 rounded-full blur-[140px] mix-blend-multiply animate-pulse-slow" style="animation-delay: 2s;"></div>
      </div>

      <div class="relative pt-20 pb-16 sm:pb-24 lg:pb-32 z-10">
        <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center animate-fade-in-up">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neo-100/80 text-neo-800 text-sm font-semibold mb-6 border border-neo-200/50 shadow-sm backdrop-blur-sm">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-500 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-neo-600"></span>
              </span>
              Neo N3 Powered
            </div>
            
            <h1 class="text-5xl tracking-tight font-extrabold text-slate-900 sm:text-6xl md:text-7xl mb-6">
              <span class="block mb-2">Programmable Accounts</span>
              <span class="block bg-clip-text text-transparent bg-gradient-to-r from-neo-600 via-teal-500 to-blue-600 drop-shadow-sm">
                for the Neo N3 Era
              </span>
            </h1>
            <p class="mt-4 max-w-3xl mx-auto text-lg text-slate-600 sm:text-xl md:mt-6 leading-relaxed">
              <strong>Why Abstract Accounts?</strong> Standard wallets rely on single, vulnerable private keys. Neo Abstract Accounts decouple identity from cryptography, transforming static addresses into <strong>programmable smart contract logic gates</strong>. <br/><br/>
              <strong>The Benefit:</strong> Enjoy Enterprise-grade Multi-Sig, automated Social Recovery, Meta-Transactions (Gasless interactions), and customizable Verifiers—all while maintaining a clean, deterministic proxy address.
            </p>
            
            <div class="mt-8 max-w-md mx-auto sm:flex sm:justify-center md:mt-10 gap-4">
              <router-link to="/studio" class="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-neo-600 to-neo-500 hover:from-neo-700 hover:to-neo-600 md:py-4 md:text-lg md:px-10 shadow-lg shadow-neo-500/30 transform transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95">
                Launch Studio
                <svg class="ml-2 -mr-1 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </router-link>
              <router-link to="/docs" class="mt-3 sm:mt-0 w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border-2 border-slate-200 text-base font-semibold rounded-xl text-slate-700 bg-white/50 backdrop-blur-sm hover:bg-white hover:border-slate-300 md:py-4 md:text-lg md:px-10 shadow-sm transform transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95">
                <svg class="mr-2 -ml-1 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Read Documentation
              </router-link>
            </div>
          </div>
          <div class="relative mt-16 lg:mt-24">
            <div class="relative rounded-2xl bg-white shadow-2xl border border-slate-200 p-8 md:p-12 overflow-hidden mx-auto max-w-5xl">
              <div class="text-center mb-8">
                <h3 class="text-2xl font-bold text-slate-900">How Abstract Accounts Work on Neo N3</h3>
                <p class="text-slate-500 mt-2 text-sm max-w-3xl mx-auto">
                  Powered by Neo N3's unique Verification Scripts. Every account acts as a tiny proxy bytecode snippet that deterministically targets the Master Entry Contract. This ensures zero deployment costs while routing all execution through a highly configurable security pipeline.
                </p>
              </div>
              <ArchitectureDiagram />
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- Features Section -->
    <div class="py-16 bg-white/60 backdrop-blur-md border-t border-white/20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative z-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h2 class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Enterprise-Grade Governance
          </h2>
          <p class="mt-4 text-xl text-slate-500">
            Abstract accounts decouple the identity from the key, enabling advanced multisig structures, social recovery, and unparalleled flexibility.
          </p>
        </div>

        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="space-y-10">
            <div class="group relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-neo-100 transition-all duration-300">
              <div class="absolute -inset-0.5 bg-gradient-to-r from-neo-500 to-teal-400 rounded-2xl opacity-0 group-hover:opacity-10 transition duration-300 blur"></div>
              <div class="relative flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-neo-50 flex items-center justify-center border border-neo-100 group-hover:bg-neo-500 group-hover:text-white transition-colors duration-300 text-neo-600">
                  <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-slate-900 mb-2">Role-Based Access Control</h3>
                  <p class="text-slate-600 leading-relaxed">
                    Assign precise thresholds for distinct roles. Let Admins dictate broad governance policy, while Managers securely execute day-to-day smart contract calls.
                  </p>
                </div>
              </div>
            </div>

            <div class="group relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300">
              <div class="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-400 rounded-2xl opacity-0 group-hover:opacity-10 transition duration-300 blur"></div>
              <div class="relative flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 text-blue-600">
                  <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-slate-900 mb-2">Dome Social Recovery</h3>
                  <p class="text-slate-600 leading-relaxed">
                    Never lose access forever. Configure trusted recovery guards (friends, legal entities, or custom Oracles) to restore access after a strictly enforced inactivity timeout.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="relative mt-10 lg:mt-0">
            <div class="relative rounded-2xl bg-slate-900 shadow-2xl p-8 border border-slate-700/50 overflow-hidden transform transition-transform hover:scale-[1.02] duration-500">
              <div class="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-neo-500 via-teal-400 to-blue-500"></div>
              <div class="flex items-center justify-between mb-6 border-b border-slate-700/50 pb-4">
                <div class="flex space-x-2">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div class="text-xs font-mono text-slate-400">AbstractAccount.cs</div>
              </div>
              <div class="font-mono text-sm space-y-4 text-slate-300">
                <p><span class="text-blue-400">public</span> <span class="text-blue-400">override</span> <span class="text-green-400">bool</span> <span class="text-yellow-200">Verify</span>()</p>
                <p class="pl-4">{</p>
                <p class="pl-8 text-slate-500">// Extract signature and scope...</p>
                <p class="pl-8"><span class="text-blue-400">bool</span> isAdmin = <span class="text-yellow-200">CheckAdmins</span>();</p>
                <p class="pl-8"><span class="text-blue-400">if</span> (isAdmin) <span class="text-blue-400">return</span> <span class="text-neo-400">true</span>;</p>
                <br/>
                <p class="pl-8"><span class="text-blue-400">bool</span> isManager = <span class="text-yellow-200">CheckManagers</span>();</p>
                <p class="pl-8"><span class="text-blue-400">if</span> (isManager) <span class="text-blue-400">return</span> <span class="text-neo-400">true</span>;</p>
                <br/>
                <p class="pl-8"><span class="text-blue-400">return</span> <span class="text-red-400">false</span>;</p>
                <p class="pl-4">}</p>
              </div>
              
              <!-- Subtle decorative blur -->
              <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-neo-500/20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';

const ArchitectureDiagram = defineAsyncComponent(() => import('@/components/ArchitectureDiagram.vue'));
</script>
