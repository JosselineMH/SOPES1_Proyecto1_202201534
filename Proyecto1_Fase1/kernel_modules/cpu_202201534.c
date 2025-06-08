#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/sched.h>
#include <linux/sched/signal.h>
#include <linux/kernel_stat.h>
#include <linux/delay.h>

#define PROC_NAME "cpu_202201534"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("202201534");
MODULE_DESCRIPTION("Módulo de monitoreo de CPU en JSON con doble lectura");
MODULE_VERSION("1.2");

static void obtener_tiempos_cpu(struct kernel_cpustat *kstat, u64 *used, u64 *total) {
    u64 user = kstat->cpustat[CPUTIME_USER];
    u64 nice = kstat->cpustat[CPUTIME_NICE];
    u64 system = kstat->cpustat[CPUTIME_SYSTEM];
    u64 idle = kstat->cpustat[CPUTIME_IDLE];
    u64 iowait = kstat->cpustat[CPUTIME_IOWAIT];
    u64 irq = kstat->cpustat[CPUTIME_IRQ];
    u64 softirq = kstat->cpustat[CPUTIME_SOFTIRQ];

    *used = user + nice + system + irq + softirq;
    *total = *used + idle + iowait;
}

static int cpu_show(struct seq_file *m, void *v) {
    struct kernel_cpustat kstat1, kstat2;
    u64 used1, total1, used2, total2;
    u64 delta_used, delta_total, porcentaje;

    // 1ra lectura
    kstat1 = kcpustat_cpu(0);
    obtener_tiempos_cpu(&kstat1, &used1, &total1);

    // espera de 2000ms
    msleep(2000);

    // 2da lectura
    kstat2 = kcpustat_cpu(0);
    obtener_tiempos_cpu(&kstat2, &used2, &total2);

    delta_used = used2 - used1;
    delta_total = total2 - total1;

    if (delta_total == 0)
        porcentaje = 0;
    else
        porcentaje = (delta_used * 100) / delta_total;

    seq_printf(m, "{\n  \"porcentajeUso\": %llu\n}\n", porcentaje);

    return 0;
}

static int cpu_open(struct inode *inode, struct file *file) {
    return single_open(file, cpu_show, NULL);
}

static const struct proc_ops cpu_ops = {
    .proc_open = cpu_open,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};

static int __init cpu_mod_init(void) {
    proc_create(PROC_NAME, 0, NULL, &cpu_ops);
    printk(KERN_INFO "Módulo CPU cargado en /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit cpu_mod_exit(void) {
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "Módulo CPU eliminado de /proc/%s\n", PROC_NAME);
}

module_init(cpu_mod_init);
module_exit(cpu_mod_exit);
