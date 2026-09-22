/**
 * 纯前端 Web Audio API 沉浸式环境音实时合成器
 * 零外部音频文件加载、零流量消耗、免版权争议、纯声学算法实时生成
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private activeSound: 'rain' | 'white' | 'none' = 'none'
  private currentVolume: number = 0.5

  private initContext() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        this.ctx = new AudioContextClass()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
  }

  /**
   * 生成粉红/舒缓高斯噪音缓冲（比纯白噪音更温和，更适合作业专注与减压）
   */
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null
    const bufferSize = this.ctx.sampleRate * 4
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const output = buffer.getChannelData(0)

    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12
      b6 = white * 0.115926
    }
    return buffer
  }

  public play(type: 'rain' | 'white') {
    this.stop()
    this.initContext()
    if (!this.ctx) return

    const buffer = this.createNoiseBuffer()
    if (!buffer) return

    this.noiseSource = this.ctx.createBufferSource()
    this.noiseSource.buffer = buffer
    this.noiseSource.loop = true

    this.filterNode = this.ctx.createBiquadFilter()
    this.gainNode = this.ctx.createGain()

    if (type === 'rain') {
      // 雨声模式：低通滤波切除尖锐高频，模拟细雨敲窗的静谧感
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime)
      this.filterNode.Q.setValueAtTime(1.1, this.ctx.currentTime)
    } else {
      // 专注白噪模式：频带适中，用于遮蔽周围谈话杂音
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.setValueAtTime(2600, this.ctx.currentTime)
      this.filterNode.Q.setValueAtTime(0.7, this.ctx.currentTime)
    }

    // 平滑淡入，避免启动爆音
    this.gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime)
    this.gainNode.gain.exponentialRampToValueAtTime(
      Math.max(0.01, this.currentVolume),
      this.ctx.currentTime + 0.6,
    )

    this.noiseSource.connect(this.filterNode)
    this.filterNode.connect(this.gainNode)
    this.gainNode.connect(this.ctx.destination)

    this.noiseSource.start()
    this.activeSound = type
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume))
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0.001, this.currentVolume), this.ctx.currentTime)
    }
  }

  public stop() {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop()
        this.noiseSource.disconnect()
      } catch {
        /* ignore */
      }
      this.noiseSource = null
    }
    this.activeSound = 'none'
  }

  public getActiveSound() {
    return this.activeSound
  }

  public getVolume() {
    return this.currentVolume
  }
}

export const ambientSound = new AmbientSoundEngine()
