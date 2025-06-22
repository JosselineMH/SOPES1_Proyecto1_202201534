#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/sched/signal.h>
#include <linux/sched.h>
#include <linux/uaccess.h>

#define PROC_NAME "procesos_202201534"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("202201534");
MODULE_DESCRIPTION("Módulo que reporta estados de procesos del sistema");
MODULE_VERSION("1.0");

static int escribir_archivo(struct seq_file *archivo, void *v) {
    struct task_struct *task;
    int corriendo = 0, durmiendo = 0, zombie = 0, parado = 0, total = 0;

    for_each_process(task) {
        long estado = READ_ONCE(task->__state);

        total++;

        if (estado == TASK_RUNNING)
            corriendo++;
        else if (estado == TASK_INTERRUPTIBLE || estado == TASK_UNINTERRUPTIBLE)
            durmiendo++;
        else if (estado == EXIT_ZOMBIE)
            zombie++;
        else if (estado == TASK_STOPPED || estado == __TASK_STOPPED)
            parado++;
        else
            durmiendo++;
    }

    seq_printf(archivo, "{\n");
    seq_printf(archivo, "  \"procesos_corriendo\": %d,\n", corriendo);
    seq_printf(archivo, "  \"total_procesos\": %d,\n", total);
    seq_printf(archivo, "  \"procesos_durmiendo\": %d,\n", durmiendo);
    seq_printf(archivo, "  \"procesos_zombie\": %d,\n", zombie);
    seq_printf(archivo, "  \"procesos_parados\": %d\n", parado);
    seq_printf(archivo, "}\n");

    return 0;
}

static int abrir(struct inode *inode, struct file *file) {
    return single_open(file, escribir_archivo, NULL);
}

static const struct proc_ops operaciones = {
    .proc_open = abrir,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};

static int __init init_modulo(void) {
    proc_create(PROC_NAME, 0, NULL, &operaciones);
    printk(KERN_INFO "Módulo procesos_202201534 cargado.\n");
    return 0;
}

static void __exit exit_modulo(void) {
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "Módulo procesos_202201534 descargado.\n");
}

module_init(init_modulo);
module_exit(exit_modulo);
