#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/mm.h>
#include <linux/sysinfo.h>

#define PROC_NAME "ram_202201534"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("202201534");
MODULE_DESCRIPTION("Modulo de monitoreo de RAM en JSON");
MODULE_VERSION("1.0");

static int ram_show(struct seq_file *m, void *v) {
    struct sysinfo info;
    unsigned long total, libre, usado, porcentaje;

    si_meminfo(&info);

    total = info.totalram * info.mem_unit / (1024 *1024);
    libre = info.freeram * info.mem_unit / (1024* 1024);
    usado = total - libre;
    porcentaje = (usado * 100) / total;

    seq_printf(m, "{\n");
    seq_printf(m, "  \"total\": %lu,\n", total);
    seq_printf(m, "  \"libre\": %lu,\n", libre);
    seq_printf(m, "  \"uso\": %lu,\n", usado);
    seq_printf(m, "  \"porcentaje\": %lu\n", porcentaje);
    seq_printf(m, "}\n");

    return 0;
}

static int ram_open(struct inode *inode, struct file *file) {
    return single_open(file, ram_show, NULL);
}

static const struct proc_ops ram_ops = {
    .proc_open = ram_open,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};

static int __init ram_init(void) {
    proc_create(PROC_NAME, 0, NULL, &ram_ops);
    printk(KERN_INFO "Módulo RAM cargado: /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit ram_exit(void) {
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "Módulo RAM eliminado: /proc/%s\n", PROC_NAME);
}

module_init(ram_init);
module_exit(ram_exit);