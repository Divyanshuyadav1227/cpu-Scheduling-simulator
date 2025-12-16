/**
 * CPU Scheduling Algorithms Module
 * Implements FCFS, SJF, Round Robin, and Priority Scheduling
 */

// ============================================
// 1. DATA STRUCTURES AND HELPER FUNCTIONS
// ============================================

/**
 * Process class to represent a process
 */
class Process {
    constructor(id, arrivalTime, burstTime, priority = 0) {
        this.id = id;
        this.arrivalTime = arrivalTime;
        this.burstTime = burstTime;
        this.remainingTime = burstTime; // For RR and preemptive algorithms
        this.priority = priority;
        this.waitingTime = 0;
        this.turnaroundTime = 0;
        this.completionTime = 0;
        this.startTime = -1; // -1 indicates not started yet
    }

    // Method to create a deep copy of the process
    clone() {
        const newProcess = new Process(
            this.id,
            this.arrivalTime,
            this.burstTime,
            this.priority
        );
        newProcess.remainingTime = this.remainingTime;
        newProcess.waitingTime = this.waitingTime;
        newProcess.turnaroundTime = this.turnaroundTime;
        newProcess.completionTime = this.completionTime;
        newProcess.startTime = this.startTime;
        return newProcess;
    }
}

/**
 * Scheduling Result class to store algorithm results
 */
class SchedulingResult {
    constructor(algorithmName, timeQuantum = null) {
        this.algorithmName = algorithmName;
        this.timeQuantum = timeQuantum;
        this.ganttChart = []; // Array of {processId, startTime, endTime}
        this.processes = []; // Array of Process objects with calculated times
        this.averageWaitingTime = 0;
        this.averageTurnaroundTime = 0;
        this.totalTime = 0; // Total execution time
        this.throughput = 0; // Processes completed per unit time
    }

    calculateAverages() {
        if (this.processes.length === 0) return;
        
        let totalWaitingTime = 0;
        let totalTurnaroundTime = 0;
        let completedCount = 0;
        
        this.processes.forEach(process => {
            if (process.completionTime > 0) { // Only count completed processes
                totalWaitingTime += process.waitingTime;
                totalTurnaroundTime += process.turnaroundTime;
                completedCount++;
            }
        });
        
        if (completedCount > 0) {
            this.averageWaitingTime = parseFloat((totalWaitingTime / completedCount).toFixed(2));
            this.averageTurnaroundTime = parseFloat((totalTurnaroundTime / completedCount).toFixed(2));
        }
        
        // Calculate throughput
        if (this.totalTime > 0) {
            this.throughput = parseFloat((completedCount / this.totalTime).toFixed(2));
        }
    }

    getMetrics() {
        return {
            algorithmName: this.algorithmName,
            timeQuantum: this.timeQuantum,
            averageWaitingTime: this.averageWaitingTime,
            averageTurnaroundTime: this.averageTurnaroundTime,
            throughput: this.throughput,
            totalTime: this.totalTime
        };
    }

    getProcessDetails() {
        return this.processes.map(p => ({
            id: p.id,
            arrivalTime: p.arrivalTime,
            burstTime: p.burstTime,
            priority: p.priority,
            waitingTime: p.waitingTime,
            turnaroundTime: p.turnaroundTime,
            completionTime: p.completionTime,
            startTime: p.startTime
        }));
    }

    getGanttChart() {
        return this.ganttChart;
    }
}

// ============================================
// 2. FIRST COME FIRST SERVED (FCFS)
// ============================================

class FCFSScheduler {
    static schedule(processes) {
        // Deep copy processes to avoid modifying original
        const processList = processes.map(p => p.clone());
        
        // Sort processes by arrival time
        processList.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        const result = new SchedulingResult("FCFS (First Come First Served)");
        result.processes = processList;
        
        let currentTime = 0;
        let ganttChart = [];
        
        for (let i = 0; i < processList.length; i++) {
            const process = processList[i];
            
            // If no process has arrived yet, jump to next arrival time
            if (currentTime < process.arrivalTime) {
                currentTime = process.arrivalTime;
            }
            
            // Set start time
            process.startTime = currentTime;
            
            // Calculate completion time
            process.completionTime = currentTime + process.burstTime;
            
            // Calculate turnaround time
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            
            // Calculate waiting time
            process.waitingTime = process.turnaroundTime - process.burstTime;
            
            // Add to Gantt chart
            ganttChart.push({
                processId: process.id,
                startTime: currentTime,
                endTime: process.completionTime,
                isIdle: false
            });
            
            // Update current time
            currentTime = process.completionTime;
        }
        
        // Handle idle times in Gantt chart
        const finalGanttChart = [];
        let lastEndTime = 0;
        
        for (let entry of ganttChart) {
            if (entry.startTime > lastEndTime) {
                // Add idle time
                finalGanttChart.push({
                    processId: "Idle",
                    startTime: lastEndTime,
                    endTime: entry.startTime,
                    isIdle: true
                });
            }
            finalGanttChart.push(entry);
            lastEndTime = entry.endTime;
        }
        
        result.ganttChart = finalGanttChart;
        result.totalTime = currentTime;
        result.calculateAverages();
        
        return result;
    }
}

// ============================================
// 3. SHORTEST JOB FIRST (SJF) - Non-preemptive
// ============================================

class SJFScheduler {
    static schedule(processes) {
        const processList = processes.map(p => p.clone());
        const result = new SchedulingResult("SJF (Shortest Job First) - Non-preemptive");
        
        // Sort by arrival time initially
        processList.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        let completedCount = 0;
        let ganttChart = [];
        const n = processList.length;
        
        // Initialize all processes as not completed
        processList.forEach(p => p.completed = false);
        
        while (completedCount < n) {
            // Find all processes that have arrived and not completed
            const availableProcesses = processList.filter(p => 
                !p.completed && p.arrivalTime <= currentTime
            );
            
            if (availableProcesses.length === 0) {
                // No process available, find next arrival time
                const nextArrival = processList
                    .filter(p => !p.completed)
                    .reduce((min, p) => p.arrivalTime < min ? p.arrivalTime : min, Infinity);
                
                if (nextArrival === Infinity) break;
                
                // Add idle time to Gantt chart
                ganttChart.push({
                    processId: "Idle",
                    startTime: currentTime,
                    endTime: nextArrival,
                    isIdle: true
                });
                
                currentTime = nextArrival;
                continue;
            }
            
            // Sort available processes by burst time (SJF)
            availableProcesses.sort((a, b) => a.burstTime - b.burstTime);
            
            const process = availableProcesses[0];
            process.startTime = currentTime;
            process.completionTime = currentTime + process.burstTime;
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            process.completed = true;
            
            // Add to Gantt chart
            ganttChart.push({
                processId: process.id,
                startTime: currentTime,
                endTime: process.completionTime,
                isIdle: false
            });
            
            currentTime = process.completionTime;
            completedCount++;
        }
        
        result.processes = processList;
        result.ganttChart = ganttChart;
        result.totalTime = currentTime;
        result.calculateAverages();
        
        return result;
    }
}

// ============================================
// 4. ROUND ROBIN (RR)
// ============================================

class RoundRobinScheduler {
    static schedule(processes, timeQuantum) {
        const processList = processes.map(p => {
            const proc = p.clone();
            proc.remainingTime = proc.burstTime;
            return proc;
        });
        
        const result = new SchedulingResult("Round Robin", timeQuantum);
        result.processes = processList;
        
        // Sort by arrival time
        processList.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        let completedCount = 0;
        const n = processList.length;
        const queue = [];
        const ganttChart = [];
        const visited = new Set();
        
        // Add first arriving processes to queue
        let index = 0;
        while (index < n && processList[index].arrivalTime <= currentTime) {
            queue.push(processList[index]);
            index++;
        }
        
        // If no process at time 0, jump to next arrival
        if (queue.length === 0 && index < n) {
            currentTime = processList[index].arrivalTime;
            while (index < n && processList[index].arrivalTime <= currentTime) {
                queue.push(processList[index]);
                index++;
            }
        }
        
        while (completedCount < n) {
            if (queue.length === 0) {
                // Queue is empty, find next arriving process
                if (index < n) {
                    currentTime = processList[index].arrivalTime;
                    while (index < n && processList[index].arrivalTime <= currentTime) {
                        queue.push(processList[index]);
                        index++;
                    }
                } else {
                    break;
                }
            }
            
            const process = queue.shift();
            
            // Set start time if this is first execution
            if (process.startTime === -1) {
                process.startTime = currentTime;
            }
            
            // Execute for time quantum or remaining time
            const executionTime = Math.min(timeQuantum, process.remainingTime);
            
            // Add to Gantt chart
            ganttChart.push({
                processId: process.id,
                startTime: currentTime,
                endTime: currentTime + executionTime,
                isIdle: false
            });
            
            process.remainingTime -= executionTime;
            currentTime += executionTime;
            
            // Add newly arrived processes to queue
            while (index < n && processList[index].arrivalTime <= currentTime) {
                // Check if process is already in queue
                if (!queue.includes(processList[index]) && processList[index].remainingTime > 0) {
                    queue.push(processList[index]);
                }
                index++;
            }
            
            // If process still has remaining time, add it back to queue
            if (process.remainingTime > 0) {
                queue.push(process);
            } else {
                // Process completed
                process.completionTime = currentTime;
                process.turnaroundTime = process.completionTime - process.arrivalTime;
                process.waitingTime = process.turnaroundTime - process.burstTime;
                completedCount++;
            }
        }
        
        // Merge consecutive entries of same process in Gantt chart
        const mergedGanttChart = [];
        for (let i = 0; i < ganttChart.length; i++) {
            if (mergedGanttChart.length === 0) {
                mergedGanttChart.push(ganttChart[i]);
            } else {
                const lastEntry = mergedGanttChart[mergedGanttChart.length - 1];
                const currentEntry = ganttChart[i];
                
                if (lastEntry.processId === currentEntry.processId && 
                    lastEntry.endTime === currentEntry.startTime) {
                    // Merge with previous entry
                    lastEntry.endTime = currentEntry.endTime;
                } else {
                    mergedGanttChart.push(currentEntry);
                }
            }
        }
        
        // Handle idle times
        const finalGanttChart = [];
        let lastEndTime = 0;
        
        for (let entry of mergedGanttChart) {
            if (entry.startTime > lastEndTime) {
                finalGanttChart.push({
                    processId: "Idle",
                    startTime: lastEndTime,
                    endTime: entry.startTime,
                    isIdle: true
                });
            }
            finalGanttChart.push(entry);
            lastEndTime = entry.endTime;
        }
        
        result.ganttChart = finalGanttChart;
        result.totalTime = currentTime;
        result.calculateAverages();
        
        return result;
    }
}

// ============================================
// 5. PRIORITY SCHEDULING - Non-preemptive
// ============================================

class PriorityScheduler {
    static schedule(processes) {
        const processList = processes.map(p => p.clone());
        const result = new SchedulingResult("Priority Scheduling - Non-preemptive");
        
        // Sort by arrival time initially
        processList.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        let completedCount = 0;
        let ganttChart = [];
        const n = processList.length;
        
        // Initialize all processes as not completed
        processList.forEach(p => p.completed = false);
        
        while (completedCount < n) {
            // Find all processes that have arrived and not completed
            const availableProcesses = processList.filter(p => 
                !p.completed && p.arrivalTime <= currentTime
            );
            
            if (availableProcesses.length === 0) {
                // No process available, find next arrival time
                const nextArrival = processList
                    .filter(p => !p.completed)
                    .reduce((min, p) => p.arrivalTime < min ? p.arrivalTime : min, Infinity);
                
                if (nextArrival === Infinity) break;
                
                // Add idle time to Gantt chart
                ganttChart.push({
                    processId: "Idle",
                    startTime: currentTime,
                    endTime: nextArrival,
                    isIdle: true
                });
                
                currentTime = nextArrival;
                continue;
            }
            
            // Sort available processes by priority (lower number = higher priority)
            // If priorities are equal, use FCFS (arrival time)
            availableProcesses.sort((a, b) => {
                if (a.priority === b.priority) {
                    return a.arrivalTime - b.arrivalTime;
                }
                return a.priority - b.priority;
            });
            
            const process = availableProcesses[0];
            process.startTime = currentTime;
            process.completionTime = currentTime + process.burstTime;
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            process.completed = true;
            
            // Add to Gantt chart
            ganttChart.push({
                processId: process.id,
                startTime: currentTime,
                endTime: process.completionTime,
                isIdle: false
            });
            
            currentTime = process.completionTime;
            completedCount++;
        }
        
        result.processes = processList;
        result.ganttChart = ganttChart;
        result.totalTime = currentTime;
        result.calculateAverages();
        
        return result;
    }
}

// ============================================
// 6. COMPARATIVE ANALYZER
// ============================================

class SchedulingAnalyzer {
    static compareAll(processes, timeQuantum = 2) {
        const results = {
            fcfs: FCFSScheduler.schedule(processes),
            sjf: SJFScheduler.schedule(processes),
            roundRobin: RoundRobinScheduler.schedule(processes, timeQuantum),
            priority: PriorityScheduler.schedule(processes)
        };
        
        // Find best algorithm based on average waiting time
        const algorithms = [
            {name: 'FCFS', waitingTime: results.fcfs.averageWaitingTime},
            {name: 'SJF', waitingTime: results.sjf.averageWaitingTime},
            {name: 'Round Robin', waitingTime: results.roundRobin.averageWaitingTime},
            {name: 'Priority', waitingTime: results.priority.averageWaitingTime}
        ];
        
        algorithms.sort((a, b) => a.waitingTime - b.waitingTime);
        const bestAlgorithm = algorithms[0];
        
        return {
            results: results,
            comparison: {
                bestAlgorithm: bestAlgorithm.name,
                bestWaitingTime: bestAlgorithm.waitingTime,
                allAlgorithms: algorithms
            }
        };
    }
    
    static generateSampleData() {
        return [
            new Process("P1", 0, 8, 3),
            new Process("P2", 1, 4, 2),
            new Process("P3", 2, 9, 4),
            new Process("P4", 3, 5, 1),
            new Process("P5", 4, 2, 5)
        ];
    }
    
    static generateRandomData(count = 5) {
        const processes = [];
        for (let i = 1; i <= count; i++) {
            processes.push(new Process(
                `P${i}`,
                Math.floor(Math.random() * 5), // Arrival time 0-4
                Math.floor(Math.random() * 10) + 1, // Burst time 1-10
                Math.floor(Math.random() * 5) + 1 // Priority 1-5
            ));
        }
        return processes;
    }
}

// ============================================
// 7. VALIDATION FUNCTIONS
// ============================================

class Validator {
    static validateProcesses(processes) {
        const errors = [];
        const ids = new Set();
        
        if (!Array.isArray(processes) || processes.length === 0) {
            errors.push("Process list must be a non-empty array");
            return { isValid: false, errors };
        }
        
        for (let i = 0; i < processes.length; i++) {
            const p = processes[i];
            
            // Check required properties
            if (!p.id) errors.push(`Process ${i}: ID is required`);
            if (p.arrivalTime === undefined || p.arrivalTime < 0) 
                errors.push(`Process ${p.id}: Arrival time must be >= 0`);
            if (!p.burstTime || p.burstTime <= 0) 
                errors.push(`Process ${p.id}: Burst time must be > 0`);
            
            // Check for duplicate IDs
            if (ids.has(p.id)) errors.push(`Duplicate process ID: ${p.id}`);
            ids.add(p.id);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateTimeQuantum(quantum) {
        if (quantum <= 0) {
            return { isValid: false, error: "Time quantum must be greater than 0" };
        }
        return { isValid: true };
    }
}

// ============================================
// 8. MAIN EXPORT
// ============================================

const CPUScheduling = {
    // Core classes
    Process,
    SchedulingResult,
    
    // Schedulers
    FCFSScheduler,
    SJFScheduler,
    RoundRobinScheduler,
    PriorityScheduler,
    
    // Utilities
    SchedulingAnalyzer,
    Validator,
    
    // Convenience methods
    schedule: function(algorithm, processes, timeQuantum = 2) {
        switch(algorithm.toLowerCase()) {
            case 'fcfs':
                return FCFSScheduler.schedule(processes);
            case 'sjf':
                return SJFScheduler.schedule(processes);
            case 'roundrobin':
            case 'rr':
                return RoundRobinScheduler.schedule(processes, timeQuantum);
            case 'priority':
                return PriorityScheduler.schedule(processes);
            default:
                throw new Error(`Unknown algorithm: ${algorithm}`);
        }
    },
    
    // Batch processing
    runAll: function(processes, timeQuantum = 2) {
        return SchedulingAnalyzer.compareAll(processes, timeQuantum);
    }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    // Node.js export
    module.exports = CPUScheduling;
} else if (typeof window !== 'undefined') {
    // Browser global export
    window.CPUScheduling = CPUScheduling;
}

// ============================================
// 9. TESTING FUNCTIONS (Development only)
// ============================================

// Self-test when run directly
if (typeof window === 'undefined' && require.main === module) {
    // Node.js test
    const sampleProcesses = SchedulingAnalyzer.generateSampleData();
    
    console.log("=== CPU Scheduling Algorithms Test ===\n");
    console.log("Sample Processes:");
    sampleProcesses.forEach(p => {
        console.log(`  ${p.id}: Arrival=${p.arrivalTime}, Burst=${p.burstTime}, Priority=${p.priority}`);
    });
    
    console.log("\n--- FCFS Results ---");
    const fcfsResult = FCFSScheduler.schedule(sampleProcesses);
    console.log(`Average Waiting Time: ${fcfsResult.averageWaitingTime}`);
    console.log(`Average Turnaround Time: ${fcfsResult.averageTurnaroundTime}`);
    
    console.log("\n--- SJF Results ---");
    const sjfResult = SJFScheduler.schedule(sampleProcesses);
    console.log(`Average Waiting Time: ${sjfResult.averageWaitingTime}`);
    console.log(`Average Turnaround Time: ${sjfResult.averageTurnaroundTime}`);
    
    console.log("\n--- Round Robin Results (Quantum=2) ---");
    const rrResult = RoundRobinScheduler.schedule(sampleProcesses, 2);
    console.log(`Average Waiting Time: ${rrResult.averageWaitingTime}`);
    console.log(`Average Turnaround Time: ${rrResult.averageTurnaroundTime}`);
    
    console.log("\n--- Priority Scheduling Results ---");
    const priorityResult = PriorityScheduler.schedule(sampleProcesses);
    console.log(`Average Waiting Time: ${priorityResult.averageWaitingTime}`);
    console.log(`Average Turnaround Time: ${priorityResult.averageTurnaroundTime}`);
    
    console.log("\n=== Test Complete ===");
}