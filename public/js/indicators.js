// Technical Indicators Module

class TechnicalIndicators {
    /**
     * Simple Moving Average (SMA)
     */
    static sma(data, period) {
        if (!data || data.length < period) return [];
        
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum / period);
        }
        return result;
    }
    
    /**
     * Exponential Moving Average (EMA)
     */
    static ema(data, period) {
        if (!data || data.length < period) return [];
        
        const multiplier = 2 / (period + 1);
        const result = [];
        
        // Start with SMA for the first value
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i];
        }
        result.push(sum / period);
        
        // Calculate EMA for remaining values
        for (let i = period; i < data.length; i++) {
            const ema = (data[i] * multiplier) + (result[result.length - 1] * (1 - multiplier));
            result.push(ema);
        }
        
        return result;
    }
    
    /**
     * Relative Strength Index (RSI)
     */
    static rsi(data, period = 14) {
        if (!data || data.length < period + 1) return [];
        
        const gains = [];
        const losses = [];
        
        // Calculate price changes
        for (let i = 1; i < data.length; i++) {
            const change = data[i] - data[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        const result = [];
        
        // Calculate initial average gain and loss
        let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
        
        // Calculate first RSI value
        const rs1 = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs1)));
        
        // Calculate remaining RSI values
        for (let i = period; i < gains.length; i++) {
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
            
            const rs = avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        }
        
        return result;
    }
    
    /**
     * Moving Average Convergence Divergence (MACD)
     */
    static macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (!data || data.length < slowPeriod) return { macd: [], signal: [], histogram: [] };
        
        const fastEMA = this.ema(data, fastPeriod);
        const slowEMA = this.ema(data, slowPeriod);
        
        // Calculate MACD line
        const macdLine = [];
        const startIndex = slowPeriod - fastPeriod;
        
        for (let i = 0; i < slowEMA.length; i++) {
            macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
        }
        
        // Calculate signal line (EMA of MACD)
        const signalLine = this.ema(macdLine, signalPeriod);
        
        // Calculate histogram
        const histogram = [];
        const signalStartIndex = signalPeriod - 1;
        
        for (let i = 0; i < signalLine.length; i++) {
            histogram.push(macdLine[i + signalStartIndex] - signalLine[i]);
        }
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }
    
    /**
     * Bollinger Bands
     */
    static bollingerBands(data, period = 20, stdDev = 2) {
        if (!data || data.length < period) return { upper: [], middle: [], lower: [] };
        
        const middle = this.sma(data, period);
        const upper = [];
        const lower = [];
        
        for (let i = period - 1; i < data.length; i++) {
            // Calculate standard deviation
            const slice = data.slice(i - period + 1, i + 1);
            const mean = middle[i - period + 1];
            const variance = slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);
            
            upper.push(mean + (stdDev * standardDeviation));
            lower.push(mean - (stdDev * standardDeviation));
        }
        
        return {
            upper: upper,
            middle: middle,
            lower: lower
        };
    }
    
    /**
     * Stochastic Oscillator
     */
    static stochastic(high, low, close, kPeriod = 14, dPeriod = 3) {
        if (!high || !low || !close || high.length < kPeriod) {
            return { k: [], d: [] };
        }
        
        const k = [];
        
        for (let i = kPeriod - 1; i < close.length; i++) {
            const highestHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1));
            const lowestLow = Math.min(...low.slice(i - kPeriod + 1, i + 1));
            
            const kValue = ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
            k.push(kValue);
        }
        
        const d = this.sma(k, dPeriod);
        
        return { k: k, d: d };
    }
    
    /**
     * Average True Range (ATR)
     */
    static atr(high, low, close, period = 14) {
        if (!high || !low || !close || high.length < 2) return [];
        
        const trueRanges = [];
        
        for (let i = 1; i < high.length; i++) {
            const tr1 = high[i] - low[i];
            const tr2 = Math.abs(high[i] - close[i - 1]);
            const tr3 = Math.abs(low[i] - close[i - 1]);
            
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return this.sma(trueRanges, period);
    }
    
    /**
     * Williams %R
     */
    static williamsR(high, low, close, period = 14) {
        if (!high || !low || !close || high.length < period) return [];
        
        const result = [];
        
        for (let i = period - 1; i < close.length; i++) {
            const highestHigh = Math.max(...high.slice(i - period + 1, i + 1));
            const lowestLow = Math.min(...low.slice(i - period + 1, i + 1));
            
            const williamsR = ((highestHigh - close[i]) / (highestHigh - lowestLow)) * -100;
            result.push(williamsR);
        }
        
        return result;
    }
    
    /**
     * Commodity Channel Index (CCI)
     */
    static cci(high, low, close, period = 20) {
        if (!high || !low || !close || high.length < period) return [];
        
        const typicalPrices = [];
        for (let i = 0; i < high.length; i++) {
            typicalPrices.push((high[i] + low[i] + close[i]) / 3);
        }
        
        const smaTP = this.sma(typicalPrices, period);
        const result = [];
        
        for (let i = period - 1; i < typicalPrices.length; i++) {
            const slice = typicalPrices.slice(i - period + 1, i + 1);
            const sma = smaTP[i - period + 1];
            
            const meanDeviation = slice.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
            const cci = (typicalPrices[i] - sma) / (0.015 * meanDeviation);
            
            result.push(cci);
        }
        
        return result;
    }
    
    /**
     * Money Flow Index (MFI)
     */
    static mfi(high, low, close, volume, period = 14) {
        if (!high || !low || !close || !volume || high.length < period + 1) return [];
        
        const typicalPrices = [];
        const rawMoneyFlows = [];
        
        for (let i = 0; i < high.length; i++) {
            const tp = (high[i] + low[i] + close[i]) / 3;
            typicalPrices.push(tp);
            rawMoneyFlows.push(tp * volume[i]);
        }
        
        const result = [];
        
        for (let i = period; i < typicalPrices.length; i++) {
            let positiveFlow = 0;
            let negativeFlow = 0;
            
            for (let j = i - period + 1; j <= i; j++) {
                if (typicalPrices[j] > typicalPrices[j - 1]) {
                    positiveFlow += rawMoneyFlows[j];
                } else if (typicalPrices[j] < typicalPrices[j - 1]) {
                    negativeFlow += rawMoneyFlows[j];
                }
            }
            
            const moneyFlowRatio = positiveFlow / negativeFlow;
            const mfi = 100 - (100 / (1 + moneyFlowRatio));
            
            result.push(mfi);
        }
        
        return result;
    }
    
    /**
     * Parabolic SAR
     */
    static parabolicSAR(high, low, acceleration = 0.02, maximum = 0.2) {
        if (!high || !low || high.length < 2) return [];
        
        const result = [];
        let isUptrend = high[1] > high[0];
        let sar = isUptrend ? low[0] : high[0];
        let ep = isUptrend ? high[1] : low[1];
        let af = acceleration;
        
        result.push(sar);
        
        for (let i = 1; i < high.length; i++) {
            const prevSAR = sar;
            
            // Calculate new SAR
            sar = prevSAR + af * (ep - prevSAR);
            
            if (isUptrend) {
                // Uptrend
                if (low[i] <= sar) {
                    // Trend reversal
                    isUptrend = false;
                    sar = ep;
                    ep = low[i];
                    af = acceleration;
                } else {
                    // Continue uptrend
                    if (high[i] > ep) {
                        ep = high[i];
                        af = Math.min(af + acceleration, maximum);
                    }
                    // Ensure SAR doesn't exceed previous two lows
                    sar = Math.min(sar, low[i - 1]);
                    if (i > 1) {
                        sar = Math.min(sar, low[i - 2]);
                    }
                }
            } else {
                // Downtrend
                if (high[i] >= sar) {
                    // Trend reversal
                    isUptrend = true;
                    sar = ep;
                    ep = high[i];
                    af = acceleration;
                } else {
                    // Continue downtrend
                    if (low[i] < ep) {
                        ep = low[i];
                        af = Math.min(af + acceleration, maximum);
                    }
                    // Ensure SAR doesn't exceed previous two highs
                    sar = Math.max(sar, high[i - 1]);
                    if (i > 1) {
                        sar = Math.max(sar, high[i - 2]);
                    }
                }
            }
            
            result.push(sar);
        }
        
        return result;
    }
    
    /**
     * Volume Weighted Average Price (VWAP)
     */
    static vwap(high, low, close, volume) {
        if (!high || !low || !close || !volume) return [];
        
        const result = [];
        let cumulativeTPV = 0; // Typical Price * Volume
        let cumulativeVolume = 0;
        
        for (let i = 0; i < high.length; i++) {
            const typicalPrice = (high[i] + low[i] + close[i]) / 3;
            const tpv = typicalPrice * volume[i];
            
            cumulativeTPV += tpv;
            cumulativeVolume += volume[i];
            
            result.push(cumulativeTPV / cumulativeVolume);
        }
        
        return result;
    }
    
    /**
     * On Balance Volume (OBV)
     */
    static obv(close, volume) {
        if (!close || !volume || close.length < 2) return [];
        
        const result = [volume[0]];
        
        for (let i = 1; i < close.length; i++) {
            if (close[i] > close[i - 1]) {
                result.push(result[result.length - 1] + volume[i]);
            } else if (close[i] < close[i - 1]) {
                result.push(result[result.length - 1] - volume[i]);
            } else {
                result.push(result[result.length - 1]);
            }
        }
        
        return result;
    }
    
    /**
     * Ichimoku Cloud
     */
    static ichimoku(high, low, close, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52) {
        if (!high || !low || !close || high.length < senkouBPeriod) {
            return {
                tenkanSen: [],
                kijunSen: [],
                senkouSpanA: [],
                senkouSpanB: [],
                chikouSpan: []
            };
        }
        
        const tenkanSen = [];
        const kijunSen = [];
        const senkouSpanA = [];
        const senkouSpanB = [];
        const chikouSpan = [];
        
        // Calculate Tenkan-sen (Conversion Line)
        for (let i = tenkanPeriod - 1; i < high.length; i++) {
            const highestHigh = Math.max(...high.slice(i - tenkanPeriod + 1, i + 1));
            const lowestLow = Math.min(...low.slice(i - tenkanPeriod + 1, i + 1));
            tenkanSen.push((highestHigh + lowestLow) / 2);
        }
        
        // Calculate Kijun-sen (Base Line)
        for (let i = kijunPeriod - 1; i < high.length; i++) {
            const highestHigh = Math.max(...high.slice(i - kijunPeriod + 1, i + 1));
            const lowestLow = Math.min(...low.slice(i - kijunPeriod + 1, i + 1));
            kijunSen.push((highestHigh + lowestLow) / 2);
        }
        
        // Calculate Senkou Span A (Leading Span A)
        const startIndex = Math.max(tenkanPeriod, kijunPeriod) - 1;
        for (let i = 0; i < Math.min(tenkanSen.length, kijunSen.length); i++) {
            const tenkanIndex = i + (startIndex - (tenkanPeriod - 1));
            const kijunIndex = i + (startIndex - (kijunPeriod - 1));
            
            if (tenkanIndex >= 0 && kijunIndex >= 0) {
                senkouSpanA.push((tenkanSen[tenkanIndex] + kijunSen[kijunIndex]) / 2);
            }
        }
        
        // Calculate Senkou Span B (Leading Span B)
        for (let i = senkouBPeriod - 1; i < high.length; i++) {
            const highestHigh = Math.max(...high.slice(i - senkouBPeriod + 1, i + 1));
            const lowestLow = Math.min(...low.slice(i - senkouBPeriod + 1, i + 1));
            senkouSpanB.push((highestHigh + lowestLow) / 2);
        }
        
        // Calculate Chikou Span (Lagging Span)
        for (let i = 0; i < close.length - kijunPeriod; i++) {
            chikouSpan.push(close[i]);
        }
        
        return {
            tenkanSen: tenkanSen,
            kijunSen: kijunSen,
            senkouSpanA: senkouSpanA,
            senkouSpanB: senkouSpanB,
            chikouSpan: chikouSpan
        };
    }
}

// Export for use in other modules
window.TechnicalIndicators = TechnicalIndicators;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechnicalIndicators;
}
