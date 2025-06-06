#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/sched/signal.h>
#include <linux/sched.h>

#define PROC_NAME "cpu_202201534"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("202201534");
MODULE_DESCRIPTION("Modulo de monitoreo de CPU en JSON");
MODULE_VERSION("1.0");

static int cpu_show(struct seq_file *m, void *v) {
    struct task_struct *task;
    int total = 0;
    int running = 0;

    for_each_process(task) {
        total++;
        if (task->__state == 0) running++; // TASK_RUNNING
    }

    unsigned long porcentaje = (total == 0) ? 0 : (running * 100) / total;

    seq_printf(m, "{\n");
    seq_printf(m, "  \"porcentajeUso\": %lu\n", porcentaje);
    seq_printf(m, "}\n");

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

static int __init cpu_module_init(void) {
    proc_create(PROC_NAME, 0, NULL, &cpu_ops);
    printk(KERN_INFO "📦 Módulo CPU cargado: /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit cpu_module_exit(void) {
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "🧹 Módulo CPU eliminado: /proc/%s\n", PROC_NAME);
}

module_init(cpu_module_init);
module_exit(cpu_module_exit);
